import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendViaQueue } from "../_shared/send-email-queue.ts";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
import {
  getEmailWrapper,
  getHouseholdMemberWelcomeContent,
} from "../_shared/email-templates.ts";

interface RequestBody {
  householdId: string;
  householdName: string;
  role: "admin" | "member" | string;
  origin?: string;
}

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  const originHeader = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(originHeader);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user?.id || !user.email) {
      return jsonResponse({ error: "Invalid token" }, 401, corsHeaders);
    }

    const { householdId, householdName, role, origin }: RequestBody = await req.json();
    if (!householdId || !householdName || !role) {
      return jsonResponse({ error: "Missing required fields" }, 400, corsHeaders);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("household_members")
      .select("role")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Error checking household membership:", membershipError);
      return jsonResponse({ error: "Could not verify household membership" }, 500, corsHeaders);
    }

    if (!membership) {
      return jsonResponse({ error: "Not a household member" }, 403, corsHeaders);
    }

    const { data: prefs } = await supabaseAdmin
      .from("user_email_preferences")
      .select("household_invitations")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prefs?.household_invitations === false) {
      return jsonResponse(
        { success: true, skipped: true, reason: "User has email notifications disabled" },
        200,
        corsHeaders,
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const displayRole = membership.role === "admin" ? "Admin" : "Member";
    const safeOrigin = origin || originHeader || "https://familydesk.in";
    const dashboardUrl = `${safeOrigin}/dashboard`;
    const emailContent = getHouseholdMemberWelcomeContent(householdName, displayRole, dashboardUrl);
    const htmlContent = getEmailWrapper(emailContent, {
      recipientName: profile?.display_name || user.email.split("@")[0],
      preheader: `You're now part of ${householdName} on Family Desk`,
    });

    const { data: emailData, error: emailError } = await sendViaQueue(supabaseUrl, supabaseServiceKey, {
      to: user.email,
      subject: `Welcome to ${householdName} - Family Desk`,
      html: htmlContent,
      templateName: "send-household-member-welcome",
      idempotencyKey: `household-welcome-${householdId}-${user.id}`,
    });

    if (emailError) {
      console.error("Resend error:", emailError);
      return jsonResponse({ error: "Failed to send welcome email", details: emailError }, 500, corsHeaders);
    }

    console.log(`Household welcome email sent to ${user.email}:`, emailData);
    return jsonResponse({ success: true, messageId: emailData?.id }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("Error sending household member welcome email:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return jsonResponse({ error: errorMessage }, 500, corsHeaders);
  }
});
