import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { validateCronSecret } from '../_shared/cron-auth.ts';
import { buildHouseholdContext } from '../_shared/aiContext.ts';
import { fetchWithTimeout } from '../_shared/fetch-with-timeout.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!validateCronSecret(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

  const { data: households } = await supabase.from('households').select('id');

  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  let processed = 0;
  for (const hh of households || []) {
    try {
      const { data: admin } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', hh.id)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();
      if (!admin) continue;

      const { data: existing } = await supabase
        .from('household_ai_insights')
        .select('id')
        .eq('household_id', hh.id)
        .eq('week_start', weekStartStr)
        .maybeSingle();
      if (existing) continue;

      const context = await buildHouseholdContext({
        supabase,
        module: 'general',
        householdId: hh.id,
        userId: admin.user_id,
      });

      const resp = await fetchWithTimeout(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: `You are FamilyDesk's household advisor. Given the household data below, generate ONE concise, specific, actionable insight for this family. Maximum 2 sentences. Be specific — cite actual numbers or names. Focus on the most important thing: a risk to fix, a win to celebrate, or an opportunity to act on. Do not be generic.\n\n${context}`,
              },
              { role: 'user', content: 'What is the most important insight for our family this week?' },
            ],
            max_tokens: 120,
            stream: false,
          }),
        },
        30_000,
      );

      const data = await resp.json();
      const insight = data.choices?.[0]?.message?.content?.trim();
      if (!insight) continue;

      await supabase.from('household_ai_insights').insert({
        household_id: hh.id,
        insight_text: insight,
        week_start: weekStartStr,
      });
      processed++;
    } catch (e: any) {
      console.error(`[generate-weekly-insight] household ${hh.id}:`, e?.message ?? e);
    }
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});