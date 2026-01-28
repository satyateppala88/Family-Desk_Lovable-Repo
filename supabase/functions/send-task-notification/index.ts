import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  getEmailWrapper, 
  getTaskAssignmentContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface TaskNotificationRequest {
  assigneeId: string;
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  dueDate?: string;
  taskId: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      assigneeId,
      assigneeName, 
      assignerName, 
      taskTitle, 
      dueDate, 
      taskId 
    }: TaskNotificationRequest = await req.json();

    // Get assignee email from admin API
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(assigneeId);
    
    if (userError || !userData?.user?.email) {
      console.log(`Could not find email for user ${assigneeId}`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User email not found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assigneeEmail = userData.user.email;

    // Check user email preferences
    const { data: prefs } = await supabaseAdmin
      .from("user_email_preferences")
      .select("task_notifications")
      .eq("user_id", assigneeId)
      .maybeSingle();

    if (prefs?.task_notifications === false) {
      console.log(`User ${assigneeEmail} has opted out of task notifications`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User opted out" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const taskUrl = `https://homemate.lovable.app/taskmaster/tasks?task=${taskId}`;
    const formattedDueDate = dueDate 
      ? new Date(dueDate).toLocaleDateString("en-US", { 
          weekday: "long", 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        }) 
      : null;

    const emailContent = getTaskAssignmentContent(
      taskTitle,
      assignerName,
      formattedDueDate,
      taskUrl
    );

    const emailResponse = await resend.emails.send({
      from: "Family Desk <noreply@familydesk.in>",
      to: [assigneeEmail],
      subject: `New Task Assigned: ${taskTitle}`,
      html: getEmailWrapper(emailContent, {
        recipientName: assigneeName,
        preheader: `${assignerName} assigned you a new task`,
      }),
    });

    console.log("Task notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: (emailResponse as any).id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending task notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
