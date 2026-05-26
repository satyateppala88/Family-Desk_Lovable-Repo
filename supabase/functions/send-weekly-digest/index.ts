import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { 
  getEmailWrapper, 
  getWeeklyDigestContent 
} from "../_shared/email-templates.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateCronSecret } from "../_shared/cron-auth.ts";

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

    // Get all household members (paginated to avoid response size limits)
    const PAGE_SIZE = 200;
    let allMembers: { user_id: string; household_id: string }[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("household_members")
        .select("user_id, household_id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allMembers = [...allMembers, ...data];
      if (data.length < PAGE_SIZE) break;
      page++;
    }
    const members = allMembers;
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
    // Week-start key in IST (Mon-anchored ISO week): YYYY-MM-DD of the Monday
    // for the current week, used to make the digest idempotent per user per week.
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const dayIdx = (istNow.getDay() + 6) % 7; // 0 = Monday
    const weekStart = new Date(istNow);
    weekStart.setDate(istNow.getDate() - dayIdx);
    const weekStartKey = weekStart.toISOString().slice(0, 10);

    const emailsSent: string[] = [];
    const errors: string[] = [];

    // Step 1: Collect unique user IDs and household IDs
    const uniqueUserIds = [...new Set(members.map(m => m.user_id))];
    const uniqueHouseholdIds = [...new Set(members.map(m => m.household_id))];

    // Step 2: Fetch ALL data in parallel — 6 queries total, not N×6
    const [allProfiles, allPrefs, allCompletedTasks, allUpcomingTasks,
           allStreaks, allMealItems] = await Promise.all([
      supabaseAdmin.from('profiles')
        .select('id, display_name, email')
        .in('id', uniqueUserIds),
      supabaseAdmin.from('user_email_preferences')
        .select('user_id, weekly_digest')
        .in('user_id', uniqueUserIds),
      supabaseAdmin.from('tasks')
        .select('id, household_id')
        .in('household_id', uniqueHouseholdIds)
        .eq('task_status', 'done')
        .gte('completed_at', weekAgo.toISOString()),
      supabaseAdmin.from('tasks')
        .select('id, household_id')
        .in('household_id', uniqueHouseholdIds)
        .neq('task_status', 'done')
        .lte('due_date', weekAhead.toISOString())
        .gte('due_date', now.toISOString()),
      supabaseAdmin.from('habit_streaks')
        .select('user_id, current_streak')
        .in('user_id', uniqueUserIds)
        .order('current_streak', { ascending: false }),
      supabaseAdmin.from('meal_plan_items')
        .select('id, meal_plans!inner(household_id)')
        .in('meal_plans.household_id', uniqueHouseholdIds),
    ]);

    // Build lookup maps for O(1) access in the loop
    const profileMap = new Map(
      (allProfiles.data ?? []).map((p: any) => [p.id, p])
    );
    const prefMap = new Map(
      (allPrefs.data ?? []).map((p: any) => [p.user_id, p])
    );
    const streakMap = new Map<string, number>();
    (allStreaks.data ?? []).forEach((s: any) => {
      if (!streakMap.has(s.user_id)) streakMap.set(s.user_id, s.current_streak);
    });

    // Step 3: Loop with ZERO DB calls inside
    const processedUsers = new Set<string>();
    for (const member of members) {
      if (processedUsers.has(member.user_id)) continue;
      processedUsers.add(member.user_id);

      try {
        const pref: any = prefMap.get(member.user_id);
        if (pref?.weekly_digest === false) continue;

        const profile: any = profileMap.get(member.user_id);
        // If no email in profiles yet, skip (depends on profiles.email column)
        if (!profile?.email) continue;

        const stats = {
          tasksCompleted: (allCompletedTasks.data ?? [])
            .filter((t: any) => t.household_id === member.household_id).length,
          tasksUpcoming: (allUpcomingTasks.data ?? [])
            .filter((t: any) => t.household_id === member.household_id).length,
          habitStreak: streakMap.get(member.user_id) ?? 0,
          mealsPlanned: (allMealItems.data ?? [])
            .filter((i: any) => i.meal_plans?.household_id === member.household_id).length,
        };

        const emailContent = getWeeklyDigestContent(stats, 'https://familydesk.in/dashboard');
        await sendViaQueue(supabaseUrl, supabaseServiceKey, {
          to: profile.email,
          subject: 'Your Weekly Family Desk Summary 📊',
          html: getEmailWrapper(emailContent),
          templateName: 'send-weekly-digest',
          idempotencyKey: `weekly-digest-${member.user_id}-${weekStartKey}`,
        });
        emailsSent.push(profile.email);
      } catch (error: any) {
        console.error(`[send-weekly-digest] user ${member.user_id}:`, error.message);
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

Deno.serve(handler);
