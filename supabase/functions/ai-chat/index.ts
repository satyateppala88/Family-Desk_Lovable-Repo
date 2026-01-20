import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define tools for the AI to use
const tools = [
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new household task",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          description: { type: "string", description: "Task description" },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          due_date: { type: "string", description: "ISO date string (optional)" },
        },
        required: ["title", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_tasks",
      description: "Get all tasks for the household",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "completed", "all"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description: "Update an existing task",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string" },
          status: { type: "string", enum: ["pending", "in_progress", "completed"] },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_meal_plan",
      description: "Get the current week's meal plan",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_household_summary",
      description: "Get overview of household (tasks, meals, grocery status)",
      parameters: { type: "object", properties: {} },
    },
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, householdId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the JWT and get the authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Validate that the authenticated user is a member of the specified household
    const { data: membership, error: membershipError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      console.error('Household membership check failed:', membershipError);
      return new Response(JSON.stringify({ error: 'You are not a member of this household' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt with personality
    const systemPrompt = `You are HomeMate AI, a friendly and proactive household assistant for Indian families. 

Your personality:
- Warm, supportive best friend who genuinely cares 😊
- Culturally aware of Indian festivals, cuisine, and household practices
- Proactive: offer helpful suggestions without being pushy
- Use casual, friendly language (like chatting with a close friend)

Your capabilities:
- Manage household tasks (create, update, complete)
- View meal plans and recipes
- Provide household insights and suggestions

Current context:
- Household ID: ${householdId}
- User ID: ${userId}

Guidelines:
- Always confirm before making changes to important data
- Suggest tasks/meals based on household preferences
- Celebrate completed tasks and milestones
- Use emojis naturally (but not excessively)

When using tools, always explain what you're doing in a friendly way.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: 'auto',
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error: any) {
    console.error('AI chat error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
