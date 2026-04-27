import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  getEmailWrapper, 
  getPantryAlertContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from "../_shared/whatsapp.ts";

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

    // Get items expiring within 3 days
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

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
      .gte("expiry_date", today.toISOString().split("T")[0])
      .lte("expiry_date", threeDaysFromNow.toISOString().split("T")[0])
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

    // Send alerts to each household's members
    for (const [householdId, items] of Object.entries(itemsByHousehold)) {
      try {
        // Get household members
        const { data: members } = await supabaseAdmin
          .from("household_members")
          .select("user_id")
          .eq("household_id", householdId);

        if (!members || members.length === 0) continue;

        const formattedItems = items.map(item => ({
          name: item.name,
          quantity: `${item.quantity || ""}${item.unit ? ` ${item.unit}` : ""}`.trim() || "N/A",
          expiryDate: new Date(item.expiry_date!).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          }),
        }));

        const emailContent = getPantryAlertContent(
          formattedItems,
          "https://familydesk.in/grocery"
        );

        // Send to each member
        for (const member of members) {
          try {
            // Get user info
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
            if (!userData?.user?.email) continue;

            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("display_name, phone_number, phone_verified, whatsapp_opted_in")
              .eq("id", member.user_id)
              .maybeSingle();

            // Check user email preferences
            const { data: prefs } = await supabaseAdmin
              .from("user_email_preferences")
              .select("pantry_alerts, pantry_alerts_whatsapp")
              .eq("user_id", member.user_id)
              .maybeSingle();

            // Send email if not opted out
            if (prefs?.pantry_alerts !== false) {
              const emailResponse = await resend.emails.send({
                from: "Family Desk <noreply@familydesk.in>",
                to: [userData.user.email],
                subject: `🥫 ${items.length} item${items.length > 1 ? "s" : ""} expiring soon!`,
                html: getEmailWrapper(emailContent, {
                  recipientName: profile?.display_name || undefined,
                  preheader: `${items[0].name}${items.length > 1 ? ` and ${items.length - 1} more items` : ""} expiring within 3 days`,
                }),
              });

              console.log(`Pantry alert email sent to ${userData.user.email}:`, emailResponse);
              emailsSent.push(userData.user.email);
            }

            // Send WhatsApp if enabled
            if (
              profile?.phone_verified &&
              profile?.whatsapp_opted_in &&
              profile?.phone_number &&
              prefs?.pantry_alerts_whatsapp
            ) {
              const itemsList = formattedItems
                .slice(0, 3)
                .map((item) => `${item.name} - ${item.expiryDate}`)
                .join(", ");

              const waResult = await sendWhatsAppTemplate(
                profile.phone_number,
                WHATSAPP_TEMPLATES.PANTRY_EXPIRY_ALERT,
                [
                  items.length.toString(),
                  itemsList,
                  "https://familydesk.in/grocery"
                ]
              );

              if (waResult.success) {
                console.log(`Pantry alert WhatsApp sent to ${profile.phone_number}`);
              } else {
                console.log(`Failed WhatsApp to ${profile.phone_number}:`, waResult.error);
              }
            }
          } catch (memberError: any) {
            console.error(`Error sending to member ${member.user_id}:`, memberError);
            errors.push(`Member ${member.user_id}: ${memberError.message}`);
          }
        }
      } catch (householdError: any) {
        console.error(`Error processing household ${householdId}:`, householdError);
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
