import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { 
  getEmailWrapper, 
  getHouseholdInvitationContent 
} from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RequestBody {
  inviteeEmail: string;
  inviteeName?: string;
  inviterName: string;
  householdName: string;
  householdId: string;
  role: string;
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
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    
    if (claimsError || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { inviteeEmail, inviteeName, inviterName, householdName, householdId, role }: RequestBody = await req.json();

    // Validate required fields
    if (!inviteeEmail || !inviterName || !householdName || !householdId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if invitee has email preferences disabled (if they're already a user)
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Try to find if this email belongs to an existing user
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === inviteeEmail);
    
    if (user) {
      const { data: prefs } = await supabaseAdmin
        .from("user_email_preferences")
        .select("household_invitations")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (prefs?.household_invitations === false) {
        console.log(`User ${inviteeEmail} has household invitations disabled`);
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: "User has email notifications disabled" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    const acceptUrl = "https://homemate.lovable.app/dashboard";
    const displayRole = role === "admin" ? "Admin" : "Member";

    const emailContent = getHouseholdInvitationContent(
      inviterName,
      householdName,
      displayRole,
      acceptUrl
    );

    const htmlContent = getEmailWrapper(emailContent, {
      recipientName: inviteeName || undefined,
      preheader: `${inviterName} has invited you to join ${householdName} on Family Desk`,
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Family Desk <noreply@familydesk.in>",
      to: [inviteeEmail],
      subject: `You're invited to join ${householdName} - Family Desk`,
      html: htmlContent,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailError }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Household invitation email sent to ${inviteeEmail}:`, emailData);

    return new Response(
      JSON.stringify({ success: true, messageId: emailData?.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending household invitation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
