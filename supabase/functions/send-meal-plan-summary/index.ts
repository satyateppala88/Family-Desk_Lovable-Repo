import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { 
  getEmailWrapper, 
  getMealPlanSummaryContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

import { sendViaQueue } from "../_shared/send-email-queue.ts";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
interface MealPlanSummaryRequest {
  mealPlanId: string;
  householdId: string;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner"];

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mealPlanId, householdId }: MealPlanSummaryRequest = await req.json();

    // Get meal plan with items and recipes
    const { data: mealPlan, error: planError } = await supabaseAdmin
      .from("meal_plans")
      .select(`
        id,
        week_start_date,
        items:meal_plan_items(
          day_of_week,
          meal_type,
          recipe:recipes(title)
        )
      `)
      .eq("id", mealPlanId)
      .single();

    if (planError || !mealPlan) {
      throw new Error("Meal plan not found");
    }

    // Format meal plan for email
    const weekDays = DAYS_OF_WEEK.map((day, index) => {
      const dayItems = (mealPlan.items as any[])?.filter((item: any) => item.day_of_week === index) || [];
      const meals = MEAL_TYPES.map(type => {
        const meal = dayItems.find((item: any) => item.meal_type === type);
        return {
          type: type.charAt(0).toUpperCase() + type.slice(1),
          name: meal?.recipe?.title || "Not planned",
        };
      });
      return { day, meals };
    });

    const emailContent = getMealPlanSummaryContent(
      weekDays,
      "https://familydesk.in/meals"
    );

    // Get household members to send email
    const { data: members } = await supabaseAdmin
      .from("household_members")
      .select("user_id")
      .eq("household_id", householdId);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No members to send email to" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    const memberIds = (members ?? []).map(m => m.user_id);

    const [allProfiles, allPrefs] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, display_name, email")
        .in("id", memberIds),
      supabaseAdmin
        .from("user_email_preferences")
        .select("user_id, meal_summaries")
        .in("user_id", memberIds),
    ]);

    const profileMap = new Map((allProfiles.data ?? []).map((p: any) => [p.id, p]));
    const prefMap = new Map((allPrefs.data ?? []).map((p: any) => [p.user_id, p]));

    const weekStart = new Date(mealPlan.week_start_date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });

    for (const member of members) {
      try {
        const pref = prefMap.get(member.user_id);
        if (pref?.meal_summaries === false) {
          console.log(`User ${member.user_id} has opted out of meal summaries`);
          continue;
        }

        const profile = profileMap.get(member.user_id);
        if (!profile?.email) continue;

        const emailResponse = await sendViaQueue(supabaseUrl, supabaseServiceKey, {
          to: profile.email,
          subject: `🍽️ Your Meal Plan for the Week of ${weekStart}`,
          html: getEmailWrapper(emailContent),
          templateName: "send-meal-plan-summary",
          idempotencyKey: `meal-plan-summary-${member.user_id}-${mealPlan.week_start_date}`,
        });

        console.log(`Meal plan summary sent to ${profile.email}:`, emailResponse);
        emailsSent.push(profile.email);
      } catch (error: any) {
        console.error(`Error sending to member ${member.user_id}:`, error);
        errors.push(`Member ${member.user_id}: ${error.message}`);
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
    console.error("Error sending meal plan summary:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);
