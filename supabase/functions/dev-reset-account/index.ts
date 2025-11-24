import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow in development
    const isDevelopment = Deno.env.get('ENVIRONMENT') !== 'production';
    if (!isDevelopment && Deno.env.get('ALLOW_DEV_RESET') !== 'true') {
      return new Response(
        JSON.stringify({ error: 'This endpoint is only available in development' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token for RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('Starting complete reset for user:', userId);

    // Get user's household
    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .single();

    if (memberError || !memberData) {
      console.error('Error getting household:', memberError);
      return new Response(
        JSON.stringify({ error: 'No household found for user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const householdId = memberData.household_id;
    console.log('Deleting household:', householdId);

    // Create admin client for operations that need elevated permissions
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Delete all household-related data in correct order (respecting foreign keys)
    
    // 1. meal_plan_items (references meal_plans)
    const { data: mealPlans } = await supabaseAdmin
      .from('meal_plans')
      .select('id')
      .eq('household_id', householdId);
    
    if (mealPlans && mealPlans.length > 0) {
      const mealPlanIds = mealPlans.map(mp => mp.id);
      await supabaseAdmin.from('meal_plan_items').delete().in('meal_plan_id', mealPlanIds);
      console.log('Deleted meal_plan_items');
    }

    // 2. meal_plans
    await supabaseAdmin.from('meal_plans').delete().eq('household_id', householdId);
    console.log('Deleted meal_plans');

    // 3. recipes
    await supabaseAdmin.from('recipes').delete().eq('household_id', householdId);
    console.log('Deleted recipes');

    // 4. task_comments (references tasks)
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('household_id', householdId);
    
    if (tasks && tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      await supabaseAdmin.from('task_comments').delete().in('task_id', taskIds);
      console.log('Deleted task_comments');
    }

    // 5. tasks
    await supabaseAdmin.from('tasks').delete().eq('household_id', householdId);
    console.log('Deleted tasks');

    // 6. task_categories
    await supabaseAdmin.from('task_categories').delete().eq('household_id', householdId);
    console.log('Deleted task_categories');

    // 7. pantry_items
    await supabaseAdmin.from('pantry_items').delete().eq('household_id', householdId);
    console.log('Deleted pantry_items');

    // 8. ai_messages (references ai_conversations)
    const { data: conversations } = await supabaseAdmin
      .from('ai_conversations')
      .select('id')
      .eq('household_id', householdId);
    
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);
      await supabaseAdmin.from('ai_messages').delete().in('conversation_id', conversationIds);
      console.log('Deleted ai_messages');
    }

    // 9. ai_conversations
    await supabaseAdmin.from('ai_conversations').delete().eq('household_id', householdId);
    console.log('Deleted ai_conversations');

    // 10. ai_suggestions
    await supabaseAdmin.from('ai_suggestions').delete().eq('household_id', householdId);
    console.log('Deleted ai_suggestions');

    // 11. household_preferences
    await supabaseAdmin.from('household_preferences').delete().eq('household_id', householdId);
    console.log('Deleted household_preferences');

    // 12. household_enabled_products
    await supabaseAdmin.from('household_enabled_products').delete().eq('household_id', householdId);
    console.log('Deleted household_enabled_products');

    // 13. dietary_preferences
    await supabaseAdmin.from('dietary_preferences').delete().eq('household_id', householdId);
    console.log('Deleted dietary_preferences');

    // 14. household_invitations
    await supabaseAdmin.from('household_invitations').delete().eq('household_id', householdId);
    console.log('Deleted household_invitations');

    // 15. user_onboarding_progress
    await supabaseAdmin.from('user_onboarding_progress').delete().eq('user_id', userId);
    console.log('Deleted user_onboarding_progress');

    // 16. user_roles
    await supabaseAdmin.from('user_roles').delete().eq('household_id', householdId);
    console.log('Deleted user_roles');

    // 17. household_members
    await supabaseAdmin.from('household_members').delete().eq('household_id', householdId);
    console.log('Deleted household_members');

    // 18. households
    await supabaseAdmin.from('households').delete().eq('id', householdId);
    console.log('Deleted household');

    // 19. profiles
    await supabaseAdmin.from('profiles').delete().eq('id', userId);
    console.log('Deleted profile');

    // 20. Delete user from auth.users using admin API
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('Error deleting user:', deleteUserError);
      throw deleteUserError;
    }
    console.log('Deleted user account');

    return new Response(
      JSON.stringify({ success: true, message: 'Account and all data deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in dev-reset-account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});