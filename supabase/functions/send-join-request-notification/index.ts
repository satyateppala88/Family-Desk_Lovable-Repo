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

    const { requesterName, householdId, householdName }: RequestBody = await req.json();

    // Validate required fields
    if (!requesterName || !householdId || !householdName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch requester's email from profile (prevent spoofing)
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", authUser.id)
      .maybeSingle();
    const requesterEmail = requesterProfile?.email ?? "";

    // Get all admin members of the household
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

    const adminIds = (admins ?? []).map((a: any) => a.user_id);

    const [adminProfiles, adminPrefs] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", adminIds),
      supabaseAdmin
        .from("user_email_preferences")
        .select("user_id, household_invitations")
        .in("user_id", adminIds),
    ]);

    const adminProfileMap = new Map((adminProfiles.data ?? []).map((p: any) => [p.id, p]));
    const adminPrefMap = new Map((adminPrefs.data ?? []).map((p: any) => [p.user_id, p]));

    for (const admin of admins) {
      const pref = adminPrefMap.get(admin.user_id);
      if (pref?.household_invitations === false) {
        console.log(`Admin ${admin.user_id} has household invitations disabled`);
        continue;
      }

      const profile = adminProfileMap.get(admin.user_id);
      if (!profile?.email) continue;

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
        to: profile.email,
        subject: `New Join Request for ${householdName} - Family Desk`,
        html: htmlContent,
        templateName: "send-join-request-notification",
        idempotencyKey: `join-request-${householdId}-${requesterEmail}-${admin.user_id}`,
      });

      if (emailError) {
        console.error(`Error sending to ${profile.email}:`, emailError);
      } else {
        emailsSent.push(profile.email);
        console.log(`Join request notification sent to ${profile.email}:`, emailData);
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailsSent.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending join request notifications:", error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.' }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

Deno.serve(handler);
