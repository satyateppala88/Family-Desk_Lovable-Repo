import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendViaQueue } from "../_shared/send-email-queue.ts";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
import { 
  getEmailWrapper, 
  getAccessApprovedContent, 
  getAccessRejectedContent 
} from "../_shared/email-templates.ts";

interface RequestBody {
  email: string;
  fullName: string;
  decision: "approved" | "rejected";
  rejectionReason?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is a platform admin using service role
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, fullName, decision, rejectionReason }: RequestBody = await req.json();

    // Validate required fields
    if (!email || !fullName || !decision) {
      return new Response(
        JSON.stringify({ error: "Email, fullName, and decision are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (decision !== "approved" && decision !== "rejected") {
      return new Response(
        JSON.stringify({ error: "Decision must be 'approved' or 'rejected'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const signupUrl = "https://familydesk.in/auth";
    
    let emailContent: string;
    let subject: string;
    let preheader: string;

    if (decision === "approved") {
      emailContent = getAccessApprovedContent(signupUrl);
      subject = "🎉 Your Access Request is Approved - Family Desk";
      preheader = "Great news! You can now create your Family Desk account";
    } else {
      emailContent = getAccessRejectedContent(rejectionReason);
      subject = "Access Request Update - Family Desk";
      preheader = "Update on your Family Desk access request";
    }

    const htmlContent = getEmailWrapper(emailContent, {
      recipientName: fullName,
      preheader,
    });

    const { data: emailData, error: emailError } = await sendViaQueue(supabaseUrl, supabaseServiceKey, {
      to: email,
      subject: "Family Desk",
      html: htmlContent,
      templateName: "send-access-decision",
      idempotencyKey: `access-decision-${email}-${decision}`,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Access ${decision} email sent to ${email}:`, emailData);

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending access decision email:", error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
