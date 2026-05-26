import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { 
  getEmailWrapper, 
  getPantryAlertContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateCronSecret } from "../_shared/cron-auth.ts";
import { todayIST, istDateOffset } from "../_shared/time.ts";
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from "../_shared/whatsapp.ts";

import { sendViaQueue } from "../_shared/send-email-queue.ts";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!validateCronSecret(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get items expiring within 3 days (IST calendar day).
    const todayStr = todayIST();
    const horizonStr = istDateOffset(3);

    const { data: expiringItems, error: itemsError } = await supabaseAdmin
      .from("pantry_items")
      .select(`
        id,
        name,
        quantity,
        unit,
        expiry_date,
        household_id
      `)
      .gte("expiry_date", todayStr)
      .lte("expiry_date", horizonStr)
      .gt("quantity", 0);

    if (itemsError) throw itemsError;

    if (!expiringItems || expiringItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No items expiring soon" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group items by household
    const itemsByHousehold: Record<string, typeof expiringItems> = {};
    for (const item of expiringItems) {
      if (!itemsByHousehold[item.household_id]) {
        itemsByHousehold[item.household_id] = [];
      }
      itemsByHousehold[item.household_id].push(item);
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Collect all member IDs across all households first
    const allHouseholdIds = Object.keys(itemsByHousehold);
    const { data: allMembers } = await supabaseAdmin
      .from('household_members')
      .select('user_id, household_id')
      .in('household_id', allHouseholdIds);

    const allMemberIds = (allMembers ?? []).map((m: any) => m.user_id);

    // Batch fetch all profiles and prefs at once
    const [allProfiles, allPrefs] = await Promise.all([
      supabaseAdmin.from('profiles')
        .select('id, email, display_name, phone_number, phone_verified, whatsapp_opted_in')
        .in('id', allMemberIds),
      supabaseAdmin.from('user_email_preferences')
        .select('user_id, pantry_alerts, pantry_alerts_whatsapp')
        .in('user_id', allMemberIds),
    ]);

    const profileMap = new Map((allProfiles.data ?? []).map((p: any) => [p.id, p]));
    const prefMap = new Map((allPrefs.data ?? []).map((p: any) => [p.user_id, p]));

    // Now loop per household with ZERO DB calls inside
    for (const [householdId, items] of Object.entries(itemsByHousehold)) {
      try {
        const householdMembers = (allMembers ?? []).filter((m: any) => m.household_id === householdId);
        if (householdMembers.length === 0) continue;

        const formattedItems = items.map(item => ({
          name: item.name,
          quantity: `${item.quantity || ''}${item.unit ? ` ${item.unit}` : ''}`.trim() || 'N/A',
          expiryDate: new Date(item.expiry_date!).toLocaleDateString('en-IN', {
            weekday: 'short', month: 'short', day: 'numeric',
          }),
        }));

        const emailContent = getPantryAlertContent(formattedItems, 'https://familydesk.in/grocery');

        for (const member of householdMembers) {
          try {
            const profile: any = profileMap.get(member.user_id);
            const pref: any = prefMap.get(member.user_id);
            if (!profile?.email) continue;

            if (pref?.pantry_alerts !== false) {
              await sendViaQueue(supabaseUrl, supabaseServiceKey, {
                to: profile.email,
                subject: `🥫 ${items.length} item${items.length > 1 ? 's' : ''} expiring soon!`,
                html: getEmailWrapper(emailContent),
                templateName: 'send-pantry-alerts',
                idempotencyKey: `pantry-alert-${member.user_id}-${todayStr}`,
              });
              emailsSent.push(profile.email);
            }

            if (profile.phone_verified && profile.whatsapp_opted_in &&
                profile.phone_number && pref?.pantry_alerts_whatsapp) {
              const itemsList = formattedItems.slice(0, 3)
                .map(i => `${i.name} - ${i.expiryDate}`).join(', ');
              await sendWhatsAppTemplate(profile.phone_number,
                WHATSAPP_TEMPLATES.PANTRY_EXPIRY_ALERT,
                [items.length.toString(), itemsList, 'https://familydesk.in/grocery']);
            }
          } catch (memberError: any) {
            errors.push(`Member ${member.user_id}: ${memberError.message}`);
          }
        }
      } catch (householdError: any) {
        errors.push(`Household ${householdId}: ${householdError.message}`);
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
    console.error("Error in send-pantry-alerts:", error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred.' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
