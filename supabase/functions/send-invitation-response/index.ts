import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { 
  getEmailWrapper, 
  getInvitationResponseContent 
} from "../_shared/email-templates.ts";
import { sendPush } from "../_shared/push.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RequestBody {
  memberName: string;
  action: "accepted" | "declined";
  householdName: string;
  invitedByUserId: string;
}

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
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

    // Verify user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { memberName, action, householdName, invitedByUserId }: RequestBody = await req.json();

    // Validate required fields
    if (!memberName || !action || !householdName || !invitedByUserId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action !== "accepted" && action !== "declined") {
      return new Response(
        JSON.stringify({ error: "Action must be 'accepted' or 'declined'" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check inviter's email preferences
    const { data: prefs } = await supabaseAdmin
      .from("user_email_preferences")
      .select("household_invitations")
      .eq("user_id", invitedByUserId)
      .maybeSingle();

    if (prefs?.household_invitations === false) {
      console.log(`User ${invitedByUserId} has household invitations disabled`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User has notifications disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get inviter's email
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(invitedByUserId);
    if (!userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Inviter not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get inviter's display name
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", invitedByUserId)
      .maybeSingle();

    const emailContent = getInvitationResponseContent(memberName, action, householdName);
    
    const subject = action === "accepted"
      ? `🎉 ${memberName} has joined ${householdName} - Family Desk`
      : `${memberName} declined the invitation - Family Desk`;
    
    const preheader = action === "accepted"
      ? `Great news! ${memberName} has joined your household`
      : `${memberName} has declined your household invitation`;

    const htmlContent = getEmailWrapper(emailContent, {
      recipientName: profile?.display_name || undefined,
      preheader,
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Family Desk <noreply@familydesk.in>",
      to: [userData.user.email],
      subject,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Invitation response email sent to ${userData.user.email}:`, emailData);

    // Fan-out Web Push to inviter (channel: invites)
    await sendPush({
      user_ids: [invitedByUserId],
      channel: "invites",
      title: action === "accepted"
        ? `🎉 ${memberName} joined ${householdName}`
        : `${memberName} declined the invite`,
      body: action === "accepted"
        ? "They now have access to your household"
        : `${memberName} won't be joining ${householdName}`,
      url: "/household/members",
      tag: `invite-response-${invitedByUserId}-${memberName}`,
      data: { action, householdName, type: "invitation_response" },
    });

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending invitation response email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
