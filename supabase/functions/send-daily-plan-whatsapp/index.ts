import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendWhatsAppTemplate, WHATSAPP_TEMPLATES } from "../_shared/whatsapp.ts";
import { sendPush } from "../_shared/push.ts";

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

    const today = new Date().toISOString().split("T")[0];

    // Get all users with WhatsApp enabled for daily plan
    const { data: usersWithWA, error: usersError } = await supabaseAdmin
      .from("user_email_preferences")
      .select("user_id")
      .eq("daily_plan_whatsapp", true);

    if (usersError) throw usersError;

    if (!usersWithWA || usersWithWA.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users with WhatsApp daily plan enabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { userId: string; sent: boolean; error?: string }[] = [];

    for (const userPref of usersWithWA) {
      try {
        // Get user profile
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name, phone_number, phone_verified, whatsapp_opted_in")
          .eq("id", userPref.user_id)
          .maybeSingle();

        if (
          !profile?.phone_verified ||
          !profile?.whatsapp_opted_in ||
          !profile?.phone_number
        ) {
          results.push({
            userId: userPref.user_id,
            sent: false,
            error: "Phone not verified or WhatsApp not opted in",
          });
          continue;
        }

        // Get user's household
        const { data: membership } = await supabaseAdmin
          .from("household_members")
          .select("household_id")
          .eq("user_id", userPref.user_id)
          .limit(1)
          .maybeSingle();

        if (!membership) {
          results.push({
            userId: userPref.user_id,
            sent: false,
            error: "No household membership",
          });
          continue;
        }

        // Get today's daily plan
        const { data: dailyPlan } = await supabaseAdmin
          .from("daily_plans")
          .select(`
            id,
            daily_plan_items (
              position,
              ai_reasoning,
              task:tasks (
                id,
                title,
                priority,
                due_date
              )
            )
          `)
          .eq("user_id", userPref.user_id)
          .eq("date", today)
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Format task list for WhatsApp
        let taskList = "No tasks planned for today";
        
        if (dailyPlan?.daily_plan_items && dailyPlan.daily_plan_items.length > 0) {
          const sortedItems = dailyPlan.daily_plan_items
            .sort((a: any, b: any) => a.position - b.position)
            .slice(0, 5);

          taskList = sortedItems
            .map((item: any, index: number) => {
              const priority = item.task?.priority === "high" ? "⚡" : "📋";
              const title = item.task?.title || "Unknown task";
              return `${index + 1}. ${priority} ${title}`;
            })
            .join("\n");
        }

        // Send WhatsApp message
        const waResult = await sendWhatsAppTemplate(
          profile.phone_number,
          WHATSAPP_TEMPLATES.DAILY_PLAN_SUMMARY,
          [
            profile.display_name || "there",
            taskList,
            "https://familydesk.in/taskmaster/today"
          ]
        );

        if (waResult.success) {
          console.log(`Daily plan WhatsApp sent to ${profile.phone_number}`);
          results.push({ userId: userPref.user_id, sent: true });
        } else {
          console.log(`Failed to send daily plan to ${profile.phone_number}:`, waResult.error);
          results.push({
            userId: userPref.user_id,
            sent: false,
            error: waResult.error,
          });
        }

        // Fan-out Web Push regardless of WhatsApp outcome (channel: daily_plan)
        await sendPush({
          user_ids: [userPref.user_id],
          channel: "daily_plan",
          title: "📋 Your plan for today",
          body: taskList === "No tasks planned for today"
            ? "No tasks planned — add one to get started"
            : taskList.split("\n").slice(0, 3).join(" · "),
          url: "/taskmaster/today",
          tag: `daily-plan-${userPref.user_id}-${today}`,
          data: { type: "daily_plan", date: today },
        });
      } catch (userError: any) {
        console.error(`Error processing user ${userPref.user_id}:`, userError);
        results.push({
          userId: userPref.user_id,
          sent: false,
          error: userError.message,
        });
      }
    }

    const sentCount = results.filter((r) => r.sent).length;

    return new Response(
      JSON.stringify({
        success: true,
        totalUsers: usersWithWA.length,
        sent: sentCount,
        failed: usersWithWA.length - sentCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-daily-plan-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
