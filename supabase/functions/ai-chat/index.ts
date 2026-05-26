import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.78.0';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimitDb, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { buildHouseholdContext, DEGRADED_CONTEXT, type AIContextModule } from "../_shared/aiContext.ts";
import { renderSystemPrompt } from "../_shared/aiSystemPrompts.ts";

// Input validation schema
const MAX_MESSAGE_LENGTH = 4000;
const MAX_MESSAGES_PER_REQUEST = 50;

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(MAX_MESSAGE_LENGTH, 'Message too long'),
  tool_calls: z.any().optional(),
});

const AIChatRequestSchema = z.object({
  messages: z.array(MessageSchema)
    .max(MAX_MESSAGES_PER_REQUEST, 'Too many messages in request'),
  householdId: z.string().uuid('Invalid household ID'),
  module: z.enum(['finance', 'habits', 'tasks', 'calendar', 'meals', 'general']).optional(),
});

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
  // GROCERY
  {
    type: "function",
    function: {
      name: "add_pantry_item",
      description: "Add an item to the household pantry inventory",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          unit: { type: "string", enum: ["kg","g","L","ml","pcs","packets","bottles","dozen"] },
          category: { type: "string", description: "e.g. Vegetables, Dairy, Grains" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_shopping_item",
      description: "Add an item to the active shopping list",
      parameters: {
        type: "object",
        required: ["item_name"],
        properties: {
          item_name: { type: "string" },
          quantity: { type: "string", description: "e.g. 2 kg, 1 packet" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pantry_status",
      description: "Check pantry inventory and items expiring soon",
      parameters: { type: "object", properties: {} },
    },
  },
  // FINANCE
  {
    type: "function",
    function: {
      name: "add_transaction",
      description: "Add a financial transaction (expense, income, or savings)",
      parameters: {
        type: "object",
        required: ["amount", "type", "category"],
        properties: {
          amount: { type: "number", description: "Amount in INR" },
          type: { type: "string", enum: ["expense", "income", "savings"] },
          category: { type: "string", description: "e.g. Groceries, Dining, Transport, Salary" },
          description: { type: "string" },
          transaction_date: { type: "string", description: "YYYY-MM-DD, defaults to today" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_finance_summary",
      description: "Get this month spending, income, and budget status",
      parameters: { type: "object", properties: {} },
    },
  },
  // HABITS
  {
    type: "function",
    function: {
      name: "log_habit",
      description: "Mark a habit as completed for today",
      parameters: {
        type: "object",
        required: ["habit_name"],
        properties: {
          habit_name: { type: "string", description: "Name or partial name of the habit" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_habit_status",
      description: "Get today habit completion and current streaks",
      parameters: { type: "object", properties: {} },
    },
  },
  // HOUSEHOLD
  {
    type: "function",
    function: {
      name: "get_expiring_items",
      description: "Get pantry items expiring in the next 7 days",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "remember_user_goal",
      description: "Save an important goal or preference the user mentioned so it is remembered in future conversations",
      parameters: {
        type: "object",
        required: ["content", "memory_type"],
        properties: {
          content: {
            type: "string",
            description: "The goal or preference to remember, e.g. saving for Goa trip by December",
          },
          memory_type: {
            type: "string",
            enum: ["goal", "preference", "context"],
          },
        },
      },
    },
  },
];

async function executeToolCall(
  fn: string, args: any, supabase: any, householdId: string, userId: string
): Promise<string> {
  switch (fn) {
    case 'create_task': {
      const priorityMap: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };
      const { data, error } = await supabase.from('tasks').insert({
        title: args.title,
        description: args.description || null,
        priority_level: priorityMap[args.priority] || 3,
        due_date: args.due_date || null,
        household_id: householdId,
        created_by: userId,
        task_status: 'pending',
      }).select('id, title').single();
      if (error) throw new Error(error.message);
      return `Task created: '${data.title}' (ID: ${data.id})`;
    }
    case 'update_task': {
      const statusMap: Record<string, string> = { pending: 'pending', in_progress: 'in_progress', completed: 'done' };
      const { error } = await supabase.from('tasks')
        .update({ task_status: statusMap[args.status] || args.status })
        .eq('id', args.task_id).eq('household_id', householdId);
      if (error) throw new Error(error.message);
      return `Task ${args.task_id} updated to ${args.status}`;
    }
    case 'list_tasks': {
      const statusFilter = args.status && args.status !== 'all' ? args.status : null;
      let query = supabase.from('tasks').select('title, task_status, due_date')
        .eq('household_id', householdId).limit(10);
      if (statusFilter) query = query.eq('task_status', statusFilter);
      const { data } = await query;
      return JSON.stringify(data || []);
    }
    case 'get_meal_plan': {
      const { data } = await supabase.from('meal_plans')
        .select('week_start_date, meal_plan_items(meal_type, scheduled_date, recipes(name))')
        .eq('household_id', householdId)
        .order('week_start_date', { ascending: false }).limit(1).maybeSingle();
      return JSON.stringify(data || {});
    }
    case 'get_household_summary': {
      const [tasks, pantry] = await Promise.all([
        supabase.from('tasks').select('id', { count: 'exact', head: true })
          .eq('household_id', householdId).neq('task_status', 'done'),
        supabase.from('pantry_items').select('id', { count: 'exact', head: true })
          .eq('household_id', householdId),
      ]);
      return JSON.stringify({ open_tasks: tasks.count, pantry_items: pantry.count });
    }
    case 'add_pantry_item': {
      const { data, error } = await supabase.from('pantry_items').insert({
        name: args.name,
        quantity: args.quantity ?? 1,
        unit: args.unit || 'pcs',
        category: args.category || 'Other',
        household_id: householdId,
        added_by: userId,
      }).select('id, name').single();
      if (error) throw new Error(error.message);
      return `Added '${data.name}' to pantry`;
    }
    case 'add_shopping_item': {
      // Find or create the active shopping list
      let { data: list } = await supabase.from('shopping_lists')
        .select('id').eq('household_id', householdId).eq('status', 'active')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!list) {
        const { data: newList, error: newListErr } = await supabase.from('shopping_lists')
          .insert({ name: 'Shopping List', household_id: householdId, created_by: userId, status: 'active' })
          .select('id').single();
        if (newListErr) throw new Error(newListErr.message);
        list = newList;
      }
      // Parse "2 kg" into numeric quantity + unit
      let qty: number | null = null;
      let unit: string | null = null;
      if (args.quantity) {
        const m = String(args.quantity).trim().match(/^([\d.]+)\s*(.*)$/);
        if (m) {
          qty = Number(m[1]) || null;
          unit = m[2]?.trim() || null;
        }
      }
      const { error } = await supabase.from('shopping_list_items').insert({
        name: args.item_name,
        quantity: qty ?? 1,
        unit,
        list_id: list.id,
        is_checked: false,
      });
      if (error) throw new Error(error.message);
      return `Added '${args.item_name}' to shopping list`;
    }
    case 'add_transaction': {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from('finance_transactions').insert({
        amount: args.amount,
        type: args.type,
        category: args.category,
        description: args.description || args.category,
        transaction_date: args.transaction_date || today,
        household_id: householdId,
        created_by: userId,
      }).select('id').single();
      if (error) throw new Error(error.message);
      return `Transaction added: ₹${args.amount} ${args.type} — ${args.category}`;
    }
    case 'log_habit': {
      const { data: habits } = await supabase.from('habits')
        .select('id, name').eq('household_id', householdId).eq('is_active', true);
      const match = habits?.find((h: any) =>
        h.name.toLowerCase().includes(String(args.habit_name).toLowerCase()));
      if (!match) return `No habit found matching '${args.habit_name}'`;
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('habit_logs').upsert({
        habit_id: match.id, user_id: userId, log_date: today, completed: true,
      }, { onConflict: 'habit_id,log_date,user_id' });
      if (error) throw new Error(error.message);
      return `Logged habit: '${match.name}' ✓`;
    }
    case 'get_pantry_status':
    case 'get_expiring_items': {
      const { data } = await supabase.from('pantry_items')
        .select('name, quantity, unit, expiry_date')
        .eq('household_id', householdId)
        .order('expiry_date', { ascending: true }).limit(20);
      return JSON.stringify(data || []);
    }
    case 'get_finance_summary': {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const { data: tx } = await supabase.from('finance_transactions')
        .select('amount, type, category')
        .eq('household_id', householdId)
        .gte('transaction_date', `${ym}-01`);
      const income = tx?.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
      const spent = tx?.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + Number(t.amount), 0) || 0;
      return JSON.stringify({ month: ym, income, spent, net: income - spent });
    }
    case 'get_habit_status': {
      const today = new Date().toISOString().slice(0, 10);
      const { data: habits } = await supabase.from('habits')
        .select('id, name').eq('household_id', householdId).eq('is_active', true);
      const habitIds = habits?.map((h: any) => h.id) || [];
      const { data: logs } = habitIds.length
        ? await supabase.from('habit_logs').select('habit_id, completed')
            .in('habit_id', habitIds).eq('log_date', today).eq('user_id', userId)
        : { data: [] };
      const doneIds = new Set((logs || []).filter((l: any) => l.completed).map((l: any) => l.habit_id));
      return JSON.stringify((habits || []).map((h: any) => ({ name: h.name, done: doneIds.has(h.id) })));
    }
    case 'remember_user_goal': {
      await supabase.from('user_ai_memory').insert({
        user_id: userId,
        household_id: householdId,
        memory_type: args.memory_type,
        content: args.content,
      });
      return `Remembered: '${args.content}'`;
    }
    default:
      return `Tool '${fn}' not yet implemented`;
  }
}

Deno.serve(async (req) => {
  const log = new Logger("ai-chat");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      log.warn("Missing authorization header");
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = AIChatRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request',
        details: validationResult.error.errors.map(e => e.message)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, householdId, module: moduleParam } = validationResult.data;
    const moduleName: AIContextModule = moduleParam || 'general';
    
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
    log.setContext({ userId, householdId });

    // Rate limiting (DB-backed; survives cold starts)
    const rateCheck = await checkRateLimitDb(
      supabase,
      userId,
      "ai-chat",
      AI_RATE_LIMIT.maxRequests,
      Math.floor(AI_RATE_LIMIT.windowMs / 1000)
    );
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil(AI_RATE_LIMIT.windowMs / 1000)) },
      });
    }

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

    // Build module-scoped household context. Degrade gracefully on failure.
    let contextBlock: string;
    let contextDegraded = false;
    try {
      contextBlock = await buildHouseholdContext({
        supabase,
        module: moduleName,
        householdId,
        userId,
      });
    } catch (ctxErr) {
      log.warn("Context build failed", { error: String(ctxErr) });
      contextBlock = DEGRADED_CONTEXT;
      contextDegraded = true;
    }
    const systemPrompt = renderSystemPrompt(moduleName, contextBlock);

    // Cap conversation history at the most recent 20 messages.
    const trimmedMessages = messages.length > 20 ? messages.slice(-20) : messages;

    // First pass: non-streaming to detect tool calls
    const firstResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...trimmedMessages,
        ],
        tools,
        tool_choice: 'auto',
        stream: false,
      }),
    });

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (firstResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${firstResponse.status}`);
    }

    const firstData = await firstResponse.json();
    const firstChoice = firstData.choices?.[0];
    const toolCalls = firstChoice?.message?.tool_calls;

    // If Gemini called tools, execute them and build tool results
    const toolResultMessages: any[] = [];
    if (toolCalls?.length) {
      for (const tc of toolCalls) {
        const fn = tc.function.name;
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* ignore */ }
        let result = '';
        try {
          result = await executeToolCall(fn, args, supabase, householdId, userId);
        } catch (e: any) {
          result = `Error: ${e.message}`;
        }
        toolResultMessages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }
    }

    // Second pass: stream the final response (with tool results if any)
    const finalMessages = toolCalls?.length
      ? [{ role: 'system', content: systemPrompt }, ...trimmedMessages,
         { role: 'assistant', content: null, tool_calls: toolCalls },
         ...toolResultMessages]
      : [{ role: 'system', content: systemPrompt }, ...trimmedMessages];

    const streamResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: finalMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      if (streamResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (streamResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please contact support." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${streamResponse.status}`);
    }

    const toolsExecuted = toolCalls?.map((tc: any) => tc.function.name).join(',') || '';
    return new Response(streamResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'x-context-degraded': contextDegraded ? 'true' : 'false',
        'x-tools-executed': toolsExecuted,
        'Access-Control-Expose-Headers': 'x-context-degraded, x-tools-executed',
      },
    });

  } catch (error: any) {
    console.error('AI chat error:', error);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
