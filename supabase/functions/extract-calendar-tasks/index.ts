import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

Deno.serve(async (req) => {
  const log = new Logger("extract-calendar-tasks");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      log.warn("Unauthorized");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { date, householdId } = await req.json();
    log.setContext({ userId: user.id, householdId });

    // Rate limiting
    const rateCheck = checkRateLimit(user.id, "extract-calendar-tasks", AI_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!householdId) {
      return new Response(
        JSON.stringify({ error: "householdId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    console.log(`Extracting tasks from calendar for ${targetDate}, household ${householdId}`);

    // Step 1: Fetch calendar events for the day
    const { data, error } = await supabase.functions.invoke('fetch-calendar-events', {
      body: {
        startDate: targetDate,
        endDate: targetDate,
        householdId: householdId
      }
    });

    const calendarEvents = data?.events || [];
    console.log(`Found ${calendarEvents.length} calendar events`);

    if (calendarEvents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No calendar events found",
          tasksCreated: 0,
          tasks: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Get existing tasks that came from calendar to avoid duplicates
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("source_calendar_event_id")
      .eq("household_id", householdId)
      .not("source_calendar_event_id", "is", null);

    const existingEventIds = new Set(
      (existingTasks || []).map(t => t.source_calendar_event_id)
    );

    // Filter out already-imported events
    const newEvents = calendarEvents.filter((e: any) => !existingEventIds.has(e.id));
    console.log(`${newEvents.length} events not yet imported`);

    if (newEvents.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "All calendar events already processed",
          tasksCreated: 0,
          tasks: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Use AI to identify which events are actionable tasks
    const systemPrompt = `You are an intelligent task extraction assistant. Analyze calendar events and identify which ones are actionable TASKS (things the user needs TO DO) versus just APPOINTMENTS/MEETINGS (things to attend or observe).

TASK-LIKE EVENTS (extract these):
- "Call dentist" - action to take
- "Book flight tickets" - action to take
- "Pick up dry cleaning" - errand to run
- "Order groceries" - action to take
- "Submit expense report" - work task
- "Renew passport" - administrative task
- "Call insurance company" - action to take
- "Schedule plumber" - action to take
- "Pay bills" - task to complete
- "Review project proposal" - work task

NOT TASKS (skip these):
- "Team standup" - meeting to attend
- "Doctor appointment" - appointment to attend
- "Dinner with friends" - social event
- "Birthday party" - event to attend
- "1:1 with manager" - meeting
- "Lunch break" - personal time
- "Flight to NYC" - travel (not actionable)
- "Kids soccer practice" - activity to attend
- "Company all-hands" - meeting

For each task-like event, determine:
1. A clean task title (remove time references, clean up formatting)
2. Priority level (1=urgent, 2=high, 3=medium, 4=low) based on the nature of the task
3. Category: "work" for professional tasks, "home" for household/personal, "kid" for child-related, "other" for everything else
4. Brief reasoning for why this is a task`;

    const eventsList = newEvents.map((e: any) => 
      `- "${e.title}" (${e.start} - ${e.end}, Calendar: ${e.calendarName || 'Primary'})`
    ).join('\n');

    const userPrompt = `Analyze these calendar events from ${targetDate} and extract any actionable tasks:

${eventsList}

Return ONLY the events that are actionable tasks the user needs to complete. Skip appointments, meetings, and events they just need to attend.`;

    const aiResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_tasks",
              description: "Extract actionable tasks from calendar events",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original_event_title: { type: "string", description: "The original calendar event title" },
                        title: { type: "string", description: "Clean task title" },
                        priority_level: { type: "number", enum: [1, 2, 3, 4], description: "1=urgent, 2=high, 3=medium, 4=low" },
                        task_category: { type: "string", enum: ["home", "work", "kid", "other"] },
                        reasoning: { type: "string", description: "Why this is a task" }
                      },
                      required: ["original_event_title", "title", "priority_level", "task_category", "reasoning"]
                    }
                  }
                },
                required: ["tasks"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_tasks" } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "AI analysis failed, no tasks extracted",
          tasksCreated: 0,
          tasks: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.log('No tool call in AI response');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No actionable tasks found in calendar events",
          tasksCreated: 0,
          tasks: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const extractedTasks: any[] = [];
    
    for (const task of parsed.tasks || []) {
      // Find the matching event by title
      const matchingEvent = newEvents.find((e: any) => 
        e.title.toLowerCase().includes(task.original_event_title.toLowerCase()) ||
        task.original_event_title.toLowerCase().includes(e.title.toLowerCase())
      );
      
      if (matchingEvent) {
        extractedTasks.push({
          title: task.title,
          priority_level: task.priority_level,
          task_category: task.task_category,
          due_date: targetDate,
          source_calendar_event_id: matchingEvent.id,
          ai_reasoning: task.reasoning
        });
      }
    }

    console.log(`AI identified ${extractedTasks.length} actionable tasks`);

    if (extractedTasks.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No actionable tasks found in calendar events",
          tasksCreated: 0,
          tasks: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Create tasks in the database
    const tasksToInsert = extractedTasks.map(task => ({
      household_id: householdId,
      title: task.title,
      description: task.ai_reasoning,
      priority_level: task.priority_level,
      task_category: task.task_category,
      task_status: 'backlog',
      due_date: task.due_date,
      source_calendar_event_id: task.source_calendar_event_id,
      created_by: user.id
    }));

    const { data: createdTasks, error: insertError } = await supabase
      .from("tasks")
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error('Error creating tasks:', insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create tasks", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${createdTasks.length} tasks from calendar`,
        tasksCreated: createdTasks.length,
        tasks: createdTasks
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error('extract-calendar-tasks error:', err);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
