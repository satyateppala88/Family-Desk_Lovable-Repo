import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendViaQueue } from "../_shared/send-email-queue.ts";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
import { 
  getEmailWrapper, 
  getJoinRequestNotificationContent 
} from "../_shared/email-templates.ts";

interface RequestBody {
  requesterName: string;
  requesterEmail: string;
  householdId: string;
  householdName: string;
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

    const { requesterName, requesterEmail, householdId, householdName }: RequestBody = await req.json();

    // Validate required fields
    if (!requesterName || !requesterEmail || !householdId || !householdName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all admin members of the household
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: admins, error: adminsError } = await supabaseAdmin
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId)
      .eq("role", "admin");

    if (adminsError) {
      console.error("Error fetching admins:", adminsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch household admins" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!admins || admins.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No admins found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const reviewUrl = "https://familydesk.in/household/members";
    const emailsSent: string[] = [];

    for (const admin of admins) {
      // Check email preferences
      const { data: prefs } = await supabaseAdmin
        .from("user_email_preferences")
        .select("household_invitations")
        .eq("user_id", admin.user_id)
        .maybeSingle();

      if (prefs?.household_invitations === false) {
        console.log(`Admin ${admin.user_id} has household invitations disabled`);
        continue;
      }

      // Get admin's email from auth
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(admin.user_id);
      if (!userData?.user?.email) continue;

      // Get admin's display name
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("id", admin.user_id)
        .maybeSingle();

      const emailContent = getJoinRequestNotificationContent(
        requesterName,
        requesterEmail,
        householdName,
        reviewUrl
      );

      const htmlContent = getEmailWrapper(emailContent, {
        recipientName: profile?.display_name || undefined,
        preheader: `${requesterName} wants to join ${householdName}`,
      });

      const { data: emailData, error: emailError } = await sendViaQueue(supabaseUrl, supabaseServiceKey, {
      to: userData.user.email,
      subject: `New Join Request for ${householdName} - Family Desk`,
      html: htmlContent,
      templateName: "send-join-request-notification",
      idempotencyKey: `join-request-${householdId}-${requesterEmail}-${admin.user_id}`,
    });

      if (emailError) {
        console.error(`Error sending to ${userData.user.email}:`, emailError);
      } else {
        emailsSent.push(userData.user.email);
        console.log(`Join request notification sent to ${userData.user.email}:`, emailData);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailsSent.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending join request notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
