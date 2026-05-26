import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";

Deno.serve(async (req) => {
  const log = new Logger("extract-calendar-tasks-preview");
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

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

    const { householdId, startDate, endDate } = await req.json();
    log.setContext({ userId: user.id, householdId });

    // Rate limiting
    const rateCheck = checkRateLimit(user.id, "extract-calendar-tasks-preview", AI_RATE_LIMIT);
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

    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || start;
    console.log(`Preview: scanning calendar ${start} to ${end}, household ${householdId}`);

    // Fetch calendar events for the date range
    const { data, error } = await supabase.functions.invoke('fetch-calendar-events', {
      body: { startDate: start, endDate: end, householdId }
    });

    if (error) {
      console.error('Error fetching calendar events:', error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch calendar events" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const calendarEvents = data?.events || [];
    console.log(`Found ${calendarEvents.length} calendar events`);

    if (calendarEvents.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], alreadyImported: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check existing tasks from calendar events
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("source_calendar_event_id")
      .eq("household_id", householdId)
      .not("source_calendar_event_id", "is", null);

    const existingEventIds = new Set(
      (existingTasks || []).map((t: any) => t.source_calendar_event_id)
    );

    const alreadyImported = calendarEvents
      .filter((e: any) => existingEventIds.has(e.id))
      .map((e: any) => ({ eventId: e.id, title: e.title }));

    const newEvents = calendarEvents.filter((e: any) => !existingEventIds.has(e.id));
    console.log(`${newEvents.length} new events, ${alreadyImported.length} already imported`);

    if (newEvents.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], alreadyImported }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to identify actionable tasks
    const systemPrompt = `You are an intelligent task extraction assistant. Analyze calendar events and identify which ones are actionable TASKS (things the user needs TO DO) versus just APPOINTMENTS/MEETINGS (things to attend).

TASK-LIKE EVENTS (extract these):
- "Call dentist", "Book flight tickets", "Pick up dry cleaning", "Order groceries"
- "Submit expense report", "Renew passport", "Pay bills", "Review project proposal"

NOT TASKS (skip these):
- "Team standup", "Doctor appointment", "Dinner with friends", "Birthday party"
- "1:1 with manager", "Flight to NYC", "Kids soccer practice", "Company all-hands"

For each task-like event, determine:
1. A clean task title
2. Priority level (1=urgent, 2=high, 3=medium, 4=low)
3. Category: "work", "home", "kid", or "other"
4. Brief reasoning for why this is a task`;

    const eventsList = newEvents.map((e: any) => 
      `- "${e.title}" (${e.start} - ${e.end}, Calendar: ${e.calendarName || 'Primary'})`
    ).join('\n');

    const userPrompt = `Analyze these calendar events from ${start} to ${end} and extract actionable tasks:\n\n${eventsList}\n\nReturn ONLY events that are actionable tasks. Skip appointments and meetings.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [{
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
                      original_event_title: { type: "string" },
                      title: { type: "string" },
                      priority_level: { type: "number", enum: [1, 2, 3, 4] },
                      task_category: { type: "string", enum: ["home", "work", "kid", "other"] },
                      reasoning: { type: "string" }
                    },
                    required: ["original_event_title", "title", "priority_level", "task_category", "reasoning"]
                  }
                }
              },
              required: ["tasks"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_tasks" } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      return new Response(
        JSON.stringify({ suggestions: [], alreadyImported }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ suggestions: [], alreadyImported }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const suggestions = (parsed.tasks || []).map((task: any) => {
      const matchingEvent = newEvents.find((e: any) => 
        e.title.toLowerCase().includes(task.original_event_title.toLowerCase()) ||
        task.original_event_title.toLowerCase().includes(e.title.toLowerCase())
      );
      
      return {
        title: task.title,
        priority_level: task.priority_level,
        task_category: task.task_category,
        reasoning: task.reasoning,
        source_calendar_event_id: matchingEvent?.id || null,
        event_date: matchingEvent?.start?.split('T')[0] || start,
      };
    }).filter((s: any) => s.source_calendar_event_id);

    console.log(`AI identified ${suggestions.length} actionable tasks`);

    return new Response(
      JSON.stringify({ suggestions, alreadyImported }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error('extract-calendar-tasks-preview error:', err);
    const corsHeaders = getCorsHeaders(req.headers.get("origin"));
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
