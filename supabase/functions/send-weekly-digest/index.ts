import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  getEmailWrapper, 
  getWeeklyDigestContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

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

    // Get all household members
    const { data: members, error: membersError } = await supabaseAdmin
      .from("household_members")
      .select("user_id, household_id");

    if (membersError) throw membersError;

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No members to send digest to" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get date ranges
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAhead = new Date(now);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Process each unique user
    const processedUsers = new Set<string>();

    for (const member of members) {
      if (processedUsers.has(member.user_id)) continue;
      processedUsers.add(member.user_id);

      try {
        // Check user email preferences
        const { data: prefs } = await supabaseAdmin
          .from("user_email_preferences")
          .select("weekly_digest")
          .eq("user_id", member.user_id)
          .maybeSingle();

        if (prefs?.weekly_digest === false) {
          console.log(`User ${member.user_id} has opted out of weekly digest`);
          continue;
        }

        // Get user info
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
        if (!userData?.user?.email) continue;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", member.user_id)
          .maybeSingle();

        // Get tasks completed this week
        const { data: completedTasks } = await supabaseAdmin
          .from("tasks")
          .select("id")
          .eq("household_id", member.household_id)
          .eq("task_status", "done")
          .gte("completed_at", weekAgo.toISOString());

        // Get upcoming tasks
        const { data: upcomingTasks } = await supabaseAdmin
          .from("tasks")
          .select("id")
          .eq("household_id", member.household_id)
          .neq("task_status", "done")
          .lte("due_date", weekAhead.toISOString())
          .gte("due_date", now.toISOString());

        // Get habit streak
        const { data: habitStreaks } = await supabaseAdmin
          .from("habit_streaks")
          .select("current_streak")
          .eq("user_id", member.user_id)
          .order("current_streak", { ascending: false })
          .limit(1);

        // Get meals planned this week
        const { data: mealPlans } = await supabaseAdmin
          .from("meal_plan_items")
          .select("id, meal_plans!inner(household_id)")
          .eq("meal_plans.household_id", member.household_id);

        const stats = {
          tasksCompleted: completedTasks?.length || 0,
          tasksUpcoming: upcomingTasks?.length || 0,
          habitStreak: habitStreaks?.[0]?.current_streak || 0,
          mealsPlanned: mealPlans?.length || 0,
        };

        const emailContent = getWeeklyDigestContent(
          stats,
          "https://homemate.lovable.app/dashboard"
        );

        const emailResponse = await resend.emails.send({
          from: "Family Desk <noreply@familydesk.in>",
          to: [userData.user.email],
          subject: "Your Weekly Family Desk Summary 📊",
          html: getEmailWrapper(emailContent, {
            recipientName: profile?.display_name || undefined,
            preheader: `You completed ${stats.tasksCompleted} tasks this week!`,
          }),
        });

        console.log(`Weekly digest sent to ${userData.user.email}:`, emailResponse);
        emailsSent.push(userData.user.email);
      } catch (error: any) {
        console.error(`Error sending digest to user ${member.user_id}:`, error);
        errors.push(`User ${member.user_id}: ${error.message}`);
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
    console.error("Error in send-weekly-digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
