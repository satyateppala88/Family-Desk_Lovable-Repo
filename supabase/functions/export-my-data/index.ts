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
      transactions,
      mealPlans,
      pantry,
      prefs,
    ] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.from('tasks').select('*').eq('created_by', userId),
      admin.from('habits').select('*').eq('user_id', userId),
      admin.from('habit_logs').select('*').eq('user_id', userId),
      admin.from('finance_transactions').select('*').eq('created_by', userId),
      admin.from('meal_plans').select('*').eq('created_by', userId),
      admin.from('pantry_items').select('*').eq('created_by', userId),
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
