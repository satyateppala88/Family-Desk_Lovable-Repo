import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authResult = await authenticateRequest(req);
  if (!authResult || !authResult.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const userId = authResult.user.id;
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const [
      profile,
      tasks,
      habits,
      habitLogs,
      habitStreaks,
      transactions,
      budgets,
      savingsGoals,
      subscriptions,
      mealPlans,
      pantry,
      shoppingLists,
      householdPrefs,
      prefs,
    ] = await Promise.all([
      admin.from('profiles').select('id, display_name, avatar_url, email, created_at').eq('id', userId).maybeSingle(),
      admin.from('tasks').select('id, title, description, task_status, due_date, priority_level, created_at').eq('created_by', userId),
      admin.from('habits').select('id, name, description, frequency_type, is_active, created_at').eq('user_id', userId),
      admin.from('habit_logs').select('habit_id, log_date, completed, actual_value').eq('user_id', userId),
      admin.from('habit_streaks').select('habit_id, current_streak, longest_streak, last_completed_date').eq('user_id', userId),
      admin.from('finance_transactions').select('id, amount, type, category, description, transaction_date').eq('created_by', userId),
      admin.from('finance_budgets').select('month, category, planned_amount').eq('created_by', userId),
      admin.from('finance_savings_goals').select('name, target_amount, current_amount, target_date, status').eq('created_by', userId),
      admin.from('finance_subscriptions').select('name, amount, billing_cycle, next_billing_date').eq('created_by', userId),
      admin.from('meal_plans').select('week_start_date, created_at').eq('created_by', userId),
      admin.from('pantry_items').select('name, quantity, unit, category, expiry_date').eq('created_by', userId),
      admin.from('shopping_lists').select('name, created_at').eq('created_by', userId),
      admin.from('household_preferences').select('diet_type, food_allergies, cuisine_preferences').eq('created_by', userId).maybeSingle(),
      admin.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      tasks: tasks.data ?? [],
      habits: habits.data ?? [],
      habit_logs: habitLogs.data ?? [],
      finance_transactions: transactions.data ?? [],
      meal_plans: mealPlans.data ?? [],
      pantry_items: pantry.data ?? [],
      notification_preferences: prefs.data,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="familydesk-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    console.error('[export-my-data] error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Export failed. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
