import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authResult = await authenticateRequest(req);
  if (!authResult?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userId = authResult.user.id;
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { data: memberData } = await admin
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberData) {
      const { household_id, role } = memberData as { household_id: string; role: string };
      if (role === 'admin') {
        const { data: otherAdmins } = await admin
          .from('household_members')
          .select('user_id')
          .eq('household_id', household_id)
          .eq('role', 'admin')
          .neq('user_id', userId);

        if (!otherAdmins || otherAdmins.length === 0) {
          const { data: otherMembers } = await admin
            .from('household_members')
            .select('user_id')
            .eq('household_id', household_id)
            .neq('user_id', userId);

          if (otherMembers && otherMembers.length > 0) {
            await admin
              .from('household_members')
              .update({ role: 'admin' })
              .eq('user_id', (otherMembers[0] as { user_id: string }).user_id)
              .eq('household_id', household_id);
          } else {
            await admin.from('households').delete().eq('id', household_id);
          }
        }
      }
      await admin.from('household_members').delete().eq('user_id', userId);
    }

    await admin.from('profiles').delete().eq('id', userId);

    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[delete-account]', error?.message ?? error);
    return new Response(
      JSON.stringify({ error: 'Account deletion failed. Please contact support.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});