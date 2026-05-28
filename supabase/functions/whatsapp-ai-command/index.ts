import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { fetchWithTimeout } from '../_shared/fetch-with-timeout.ts';
import { buildHouseholdContext } from '../_shared/aiContext.ts';

async function sendWhatsAppReply(to: string, text: string) {
  const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
  const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!;
  await fetch(`https://graph.facebook.com/v18.0/${PHONE_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Meta webhook verification (GET)
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response('ok', { status: 200 });
  }

  // Extract message from Meta WhatsApp Cloud API webhook shape, with fallback to flat shape
  const change = body?.entry?.[0]?.changes?.[0]?.value;
  const msg = change?.messages?.[0];
  const phone: string | undefined = msg?.from ?? body?.from;
  const messageText: string =
    msg?.text?.body ||
    msg?.interactive?.button_reply?.title ||
    msg?.interactive?.list_reply?.title ||
    body?.text?.body ||
    body?.interactive?.button_reply?.title ||
    '';

  if (!phone || !messageText) return new Response('ok', { status: 200 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('phone_number', `+${phone}`)
    .eq('phone_verified', true)
    .maybeSingle();

  if (!profile) {
    await sendWhatsAppReply(phone, 'This number is not linked to a FamilyDesk account. Sign up at familydesk.in');
    return new Response('ok', { status: 200 });
  }

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', profile.id)
    .maybeSingle();
  if (!member) return new Response('ok', { status: 200 });

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
  try {
    const context = await buildHouseholdContext({
      supabase,
      module: 'general',
      householdId: member.household_id,
      userId: profile.id,
    });

    const aiResp = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are FamilyDesk's WhatsApp assistant for ${profile.display_name}. Process their command and respond in 1-2 short sentences. Use ₹ for amounts. Be direct.\n\n${context}`,
            },
            { role: 'user', content: messageText },
          ],
          stream: false,
          max_tokens: 150,
        }),
      },
      30_000
    );

    const aiData = await aiResp.json();
    const reply = aiData.choices?.[0]?.message?.content || 'Done!';
    await sendWhatsAppReply(phone, reply);
  } catch (e: any) {
    console.error('[whatsapp-ai-command]', e?.message ?? e);
    await sendWhatsAppReply(phone, 'Sorry, I could not process that. Try again!');
  }

  return new Response('ok', { status: 200 });
});