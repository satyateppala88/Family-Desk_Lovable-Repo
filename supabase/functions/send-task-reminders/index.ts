import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  getEmailWrapper, 
  getTaskReminderContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get tomorrow's date range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Get tasks due tomorrow that aren't completed
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from("tasks")
      .select(`
        id,
        title,
        due_date,
        assigned_to,
        household_id,
        task_status
      `)
      .gte("due_date", tomorrow.toISOString())
      .lt("due_date", dayAfterTomorrow.toISOString())
      .neq("task_status", "done")
      .not("assigned_to", "is", null);

    if (tasksError) {
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No tasks due tomorrow");
      return new Response(
        JSON.stringify({ success: true, message: "No tasks due tomorrow" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group tasks by assignee
    const tasksByAssignee: Record<string, typeof tasks> = {};
    for (const task of tasks) {
      if (task.assigned_to) {
        if (!tasksByAssignee[task.assigned_to]) {
          tasksByAssignee[task.assigned_to] = [];
        }
        tasksByAssignee[task.assigned_to].push(task);
      }
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Send emails to each assignee
    for (const [userId, userTasks] of Object.entries(tasksByAssignee)) {
      try {
        // Check user email preferences
        const { data: prefs } = await supabaseAdmin
          .from("user_email_preferences")
          .select("task_notifications")
          .eq("user_id", userId)
          .maybeSingle();

        if (prefs?.task_notifications === false) {
          console.log(`User ${userId} has opted out of task notifications`);
          continue;
        }

        // Get user info
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!userData?.user?.email) {
          console.log(`No email found for user ${userId}`);
          continue;
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();

        const formattedTasks = userTasks.map(t => ({
          title: t.title,
          dueDate: new Date(t.due_date!).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        }));

        const emailContent = getTaskReminderContent(
          formattedTasks,
          "https://familydesk.lovable.app/taskmaster/today"
        );

        const emailResponse = await resend.emails.send({
          from: "Family Desk <noreply@familydesk.in>",
          to: [userData.user.email],
          subject: `Reminder: ${userTasks.length} task${userTasks.length > 1 ? "s" : ""} due tomorrow`,
          html: getEmailWrapper(emailContent, {
            recipientName: profile?.display_name || undefined,
            preheader: `You have ${userTasks.length} task${userTasks.length > 1 ? "s" : ""} due tomorrow`,
          }),
        });

        console.log(`Task reminder sent to ${userData.user.email}:`, emailResponse);
        emailsSent.push(userData.user.email);
      } catch (error: any) {
        console.error(`Error sending reminder to user ${userId}:`, error);
        errors.push(`User ${userId}: ${error.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent: emailsSent.length,
        recipients: emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-task-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
