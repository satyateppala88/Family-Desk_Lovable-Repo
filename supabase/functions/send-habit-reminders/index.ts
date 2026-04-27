import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { 
  getEmailWrapper, 
  getHabitReminderContent,
  getStreakWarningContent
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

    const today = new Date().toISOString().split("T")[0];

    // Get all active habits with their assignees
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from("habits")
      .select(`
        id,
        name,
        household_id,
        user_id,
        assignment_type,
        habit_assignees(user_id),
        habit_streaks(user_id, current_streak)
      `)
      .eq("is_active", true);

    if (habitsError) throw habitsError;

    if (!habits || habits.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active habits" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user -> habits mapping with streak info
    const userHabits: Record<string, Array<{ name: string; streak: number; habitId: string }>> = {};
    const streakWarnings: Record<string, Array<{ name: string; streak: number; habitId: string }>> = {};

    for (const habit of habits) {
      // Determine which users this habit applies to
      const userIds: string[] = [];
      
      if (habit.assignment_type === "personal") {
        userIds.push(habit.user_id);
      } else if (habit.assignment_type === "specific" && habit.habit_assignees) {
        userIds.push(...habit.habit_assignees.map((a: any) => a.user_id));
      } else if (habit.assignment_type === "household") {
        // Get all household members
        const { data: members } = await supabaseAdmin
          .from("household_members")
          .select("user_id")
          .eq("household_id", habit.household_id);
        if (members) {
          userIds.push(...members.map(m => m.user_id));
        }
      }

      for (const userId of userIds) {
        // Check if user already logged this habit today
        const { data: todayLog } = await supabaseAdmin
          .from("habit_logs")
          .select("id")
          .eq("habit_id", habit.id)
          .eq("user_id", userId)
          .eq("log_date", today)
          .maybeSingle();

        if (todayLog) continue; // Already logged today

        // Get user's streak for this habit
        const userStreak = habit.habit_streaks?.find((s: any) => s.user_id === userId);
        const streak = userStreak?.current_streak || 0;

        if (!userHabits[userId]) {
          userHabits[userId] = [];
        }
        userHabits[userId].push({ 
          name: habit.name, 
          streak, 
          habitId: habit.id 
        });

        // Check for streak at risk (has a streak but hasn't logged today)
        if (streak >= 3) {
          if (!streakWarnings[userId]) {
            streakWarnings[userId] = [];
          }
          streakWarnings[userId].push({ 
            name: habit.name, 
            streak, 
            habitId: habit.id 
          });
        }
      }
    }

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Send reminder emails
    for (const [userId, habitsToRemind] of Object.entries(userHabits)) {
      try {
        // Check user email preferences
        const { data: prefs } = await supabaseAdmin
          .from("user_email_preferences")
          .select("habit_reminders")
          .eq("user_id", userId)
          .maybeSingle();

        if (prefs?.habit_reminders === false) {
          console.log(`User ${userId} has opted out of habit reminders`);
          continue;
        }

        // Get user info
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!userData?.user?.email) continue;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();

        // Check if there are streak warnings for this user
        const userStreakWarnings = streakWarnings[userId];
        
        if (userStreakWarnings && userStreakWarnings.length > 0) {
          // Send streak warning for the highest streak at risk
          const highestStreak = userStreakWarnings.reduce((prev, curr) => 
            curr.streak > prev.streak ? curr : prev
          );

          const warningContent = getStreakWarningContent(
            highestStreak.name,
            highestStreak.streak,
            "https://familydesk.in/habits"
          );

          await resend.emails.send({
            from: "Family Desk <noreply@familydesk.in>",
            to: [userData.user.email],
            subject: `⚠️ Your ${highestStreak.streak}-day streak is at risk!`,
            html: getEmailWrapper(warningContent, {
              recipientName: profile?.display_name || undefined,
              preheader: `Don't lose your ${highestStreak.streak}-day streak on ${highestStreak.name}!`,
            }),
          });
        } else {
          // Send regular habit reminder
          const emailContent = getHabitReminderContent(
            habitsToRemind.map(h => ({ name: h.name, streak: h.streak })),
            "https://familydesk.in/habits"
          );

          await resend.emails.send({
            from: "Family Desk <noreply@familydesk.in>",
            to: [userData.user.email],
            subject: "🌟 Don't forget your habits today!",
            html: getEmailWrapper(emailContent, {
              recipientName: profile?.display_name || undefined,
              preheader: `You have ${habitsToRemind.length} habit${habitsToRemind.length > 1 ? "s" : ""} to check in today`,
            }),
          });
        }

        console.log(`Habit reminder sent to ${userData.user.email}`);
        emailsSent.push(userData.user.email);
      } catch (error: any) {
        console.error(`Error sending habit reminder to user ${userId}:`, error);
        errors.push(`User ${userId}: ${error.message}`);
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
    console.error("Error in send-habit-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
