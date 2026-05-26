import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, AI_RATE_LIMIT } from "../_shared/rate-limit.ts";
import { Logger } from "../_shared/logger.ts";
import { fetchWithTimeout } from "../_shared/fetch-with-timeout.ts";

interface TaskWithScore {
  task: any;
  score: number;
  reasoning?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarOwner?: string;
}

// Fetch today's calendar events for the user
async function fetchCalendarEvents(
  supabase: any,
  householdId: string,
  targetDate: string
): Promise<CalendarEvent[]> {
  try {
    // Get calendar connections for the household
    const { data: connections, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("household_id", householdId)
      .eq("is_visible", true);

    if (error || !connections || connections.length === 0) {
      console.log("No calendar connections found");
      return [];
    }

    // Call the fetch-calendar-events function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-calendar-events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: targetDate,
        endDate: targetDate,
        householdId,
      }),
    });

    if (!response.ok) {
      console.error("Failed to fetch calendar events:", response.status);
      return [];
    }

    const events = await response.json();
    return events || [];
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
}

// Analyze calendar busyness
function analyzeCalendarBusyness(events: CalendarEvent[]): {
  totalEvents: number;
  totalMeetingHours: number;
  busyLevel: 'light' | 'moderate' | 'busy' | 'packed';
  freeSlots: string[];
} {
  let totalMinutes = 0;
  const busyPeriods: { start: Date; end: Date }[] = [];

  for (const event of events) {
    if (!event.allDay) {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      totalMinutes += duration;
      busyPeriods.push({ start, end });
    }
  }

  const totalHours = totalMinutes / 60;
  let busyLevel: 'light' | 'moderate' | 'busy' | 'packed';
  
  if (totalHours <= 2) busyLevel = 'light';
  else if (totalHours <= 4) busyLevel = 'moderate';
  else if (totalHours <= 6) busyLevel = 'busy';
  else busyLevel = 'packed';

  // Find free slots (simplified - just identify general availability)
  const freeSlots: string[] = [];
  if (totalHours < 3) freeSlots.push("morning (9am-12pm)");
  if (totalHours < 5) freeSlots.push("afternoon (1pm-5pm)");
  if (totalHours < 7) freeSlots.push("evening (6pm-9pm)");

  return {
    totalEvents: events.length,
    totalMeetingHours: Math.round(totalHours * 10) / 10,
    busyLevel,
    freeSlots,
  };
}

// Fallback rule-based scoring when AI is unavailable
function scoreTasksWithRules(tasks: any[], today: Date, calendarBusyness?: ReturnType<typeof analyzeCalendarBusyness>): TaskWithScore[] {
  // Reduce task load if calendar is busy
  const maxTasks = calendarBusyness?.busyLevel === 'packed' ? 4 
    : calendarBusyness?.busyLevel === 'busy' ? 5 
    : 7;

  return tasks.slice(0, maxTasks * 2).map((task: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Priority weight
    const priorityScore = (5 - (task.priority_level || 3)) * 20;
    score += priorityScore;
    if (task.priority_level === 1) reasons.push("Urgent priority");
    else if (task.priority_level === 2) reasons.push("High priority");

    // Due date urgency
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 0) {
        score += 60;
        reasons.push(daysDiff === 0 ? "Due today" : "Overdue");
      } else if (daysDiff <= 3) {
        score += 40;
        reasons.push(`Due in ${daysDiff} day${daysDiff > 1 ? "s" : ""}`);
      } else if (daysDiff <= 7) {
        score += 20;
        reasons.push("Due this week");
      }
    }

    // Age factor
    const createdAt = new Date(task.created_at);
    const ageDays = Math.max(0, Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    score += Math.min(ageDays, 10) * 3;
    if (ageDays > 7) reasons.push(`${ageDays} days old`);

    // Status bias
    if (task.task_status === "in_progress") {
      score += 25;
      reasons.push("Already started");
    }

    // Category tweak - consider time of day fit
    if (task.task_category === "kid") {
      score += 10;
      if (!reasons.includes("Kid-related")) reasons.push("Kid-related");
    }

    // Calendar-aware adjustments
    if (calendarBusyness) {
      // On busy days, prioritize quick/urgent tasks
      if (calendarBusyness.busyLevel === 'packed' || calendarBusyness.busyLevel === 'busy') {
        if (task.priority_level === 1) {
          score += 15; // Boost urgent tasks on busy days
          reasons.push("Fits busy schedule");
        }
      }
    }

    return { 
      task, 
      score, 
      reasoning: reasons.length > 0 ? reasons.join(" • ") : "Balanced priority"
    };
  });
}

// AI-powered smart prioritization with calendar awareness
async function scoreTasksWithAI(
  tasks: any[], 
  today: Date,
  apiKey: string,
  calendarEvents: CalendarEvent[],
  calendarBusyness: ReturnType<typeof analyzeCalendarBusyness>
): Promise<TaskWithScore[] | null> {
  try {
    const taskSummaries = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority_level,
      category: t.task_category,
      status: t.task_status,
      due_date: t.due_date,
      created_at: t.created_at,
      age_days: Math.floor((today.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
    }));

    // Build calendar context for AI
    const calendarContext = calendarEvents.length > 0 
      ? `
TODAY'S CALENDAR (${calendarEvents.length} events, ${calendarBusyness.totalMeetingHours} hours scheduled):
${calendarEvents.map(e => {
  const start = new Date(e.start);
  const end = new Date(e.end);
  const timeStr = e.allDay ? "All day" : `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  return `- ${timeStr}: ${e.title}${e.calendarOwner ? ` (${e.calendarOwner})` : ''}`;
}).join('\n')}

SCHEDULE ANALYSIS:
- Day busyness: ${calendarBusyness.busyLevel.toUpperCase()}
- Free time slots: ${calendarBusyness.freeSlots.join(', ') || 'Very limited'}
- Recommendation: ${calendarBusyness.busyLevel === 'packed' ? 'Select only 3-4 critical tasks' : calendarBusyness.busyLevel === 'busy' ? 'Select 4-5 important tasks' : 'Normal task load (up to 7 tasks)'}
`
      : `
NO CALENDAR DATA AVAILABLE - Assume normal day with flexible schedule.
`;

    const systemPrompt = `You are a smart task prioritization assistant helping a busy family manage their day.

Today's date is ${today.toISOString().split("T")[0]}.
${calendarContext}

Analyze the provided tasks and select the most important tasks for today. Consider:

1. **Calendar Awareness**: 
   - On busy/packed days, select FEWER tasks (3-5 max)
   - Work tasks fit better during work hours (9am-5pm) when not in meetings
   - Home tasks fit better in evenings or during free slots
   - Kid-related tasks often align with school schedules (pickup ~3pm, activities)
   - Don't overcommit on meeting-heavy days

2. **Urgency**: Overdue and due-soon tasks should be prioritized
3. **Priority level**: P1 (critical) > P2 (high) > P3 (normal) > P4 (low)
4. **Work continuity**: Tasks already in_progress should often be completed
5. **Balance**: Try to include a mix of categories when possible
6. **Task age**: Older tasks shouldn't be forgotten

For each selected task, provide a brief, friendly reasoning (under 12 words) that may reference calendar context when relevant.`;

    const response = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are my open tasks:\n${JSON.stringify(taskSummaries, null, 2)}\n\nSelect and prioritize the best tasks for today given my calendar.` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "select_daily_tasks",
              description: "Select and prioritize tasks for today's plan based on calendar availability",
              parameters: {
                type: "object",
                properties: {
                  selected_tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task_id: { 
                          type: "string",
                          description: "The ID of the task" 
                        },
                        position: { 
                          type: "integer",
                          description: "Priority position (1 = most important)" 
                        },
                        reasoning: { 
                          type: "string",
                          description: "Brief explanation including calendar context when relevant (under 12 words)" 
                        },
                        suggested_time: {
                          type: "string",
                          description: "Optional: suggested time slot like 'morning', 'after 2pm meeting', 'evening'"
                        }
                      },
                      required: ["task_id", "position", "reasoning"]
                    },
                    description: "Array of selected tasks in priority order, adjusted for calendar busyness"
                  },
                  day_summary: {
                    type: "string",
                    description: "Brief summary of how the day looks for tasks"
                  }
                },
                required: ["selected_tasks"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "select_daily_tasks" } }
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return null;
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      console.error("No valid tool call in AI response");
      return null;
    }

    const result = JSON.parse(toolCall.function.arguments);
    const selectedTasks = result.selected_tasks || [];

    console.log("AI day summary:", result.day_summary);

    // Map AI selections back to tasks
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const scoredTasks: TaskWithScore[] = [];

    for (const selection of selectedTasks) {
      const task = taskMap.get(selection.task_id);
      if (task) {
        const reasoning = selection.suggested_time 
          ? `${selection.reasoning} (${selection.suggested_time})`
          : selection.reasoning;
        
        scoredTasks.push({
          task,
          score: 100 - (selection.position * 10),
          reasoning
        });
      }
    }

    return scoredTasks.length > 0 ? scoredTasks : null;
  } catch (error) {
    console.error("AI scoring failed:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  const log = new Logger("generate-daily-plan");
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      log.warn("Missing or malformed Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      log.warn("Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date, forceRegenerate, householdId } = await req.json();
    log.setContext({ userId: user.id, householdId });

    // Rate limiting
    const rateCheck = checkRateLimit(user.id, "generate-daily-plan", AI_RATE_LIMIT);
    if (!rateCheck.allowed) {
      log.warn("Rate limit exceeded");
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) },
      });
    }

    const targetDate = date || new Date().toISOString().split("T")[0];
    const today = new Date(targetDate);

    // Check if plan exists
    const { data: existingPlan } = await supabase
      .from("daily_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("household_id", householdId)
      .eq("date", targetDate)
      .maybeSingle();

    // If plan exists and is accepted, only regenerate with force flag
    if (existingPlan && existingPlan.accepted && !forceRegenerate) {
      return new Response(JSON.stringify({ 
        message: "Plan already accepted", 
        planId: existingPlan.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all tasks assigned to the user that are open
    const { data: taskAssignees } = await supabase
      .from("task_assignees")
      .select("task_id")
      .eq("user_id", user.id);

    const assignedTaskIds = taskAssignees?.map((ta: any) => ta.task_id) || [];

    // Helper to handle empty plan scenarios
    const handleEmptyPlan = async (message: string) => {
      if (existingPlan) {
        await supabase
          .from("daily_plan_items")
          .delete()
          .eq("daily_plan_id", existingPlan.id);
        
        await supabase
          .from("daily_plans")
          .update({ generated_at: new Date().toISOString(), accepted: false })
          .eq("id", existingPlan.id);
        
        return new Response(JSON.stringify({ message, planId: existingPlan.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newPlan } = await supabase
        .from("daily_plans")
        .insert({
          user_id: user.id,
          household_id: householdId,
          date: targetDate,
          accepted: false,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return new Response(JSON.stringify({ message, planId: newPlan?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    };

    if (assignedTaskIds.length === 0) {
      return handleEmptyPlan("Plan generated (no tasks assigned)");
    }

    // Fetch tasks with open status
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("id", assignedTaskIds)
      .in("task_status", ["backlog", "today", "in_progress", "blocked"])
      .eq("household_id", householdId);

    if (!tasks || tasks.length === 0) {
      return handleEmptyPlan("Plan generated (no open tasks)");
    }

    // Fetch calendar events for today to inform prioritization
    const calendarEvents = await fetchCalendarEvents(supabase, householdId, targetDate);
    const calendarBusyness = analyzeCalendarBusyness(calendarEvents);
    
    console.log(`Calendar analysis: ${calendarEvents.length} events, ${calendarBusyness.totalMeetingHours}h scheduled, ${calendarBusyness.busyLevel} day`);

    // Try AI-powered scoring first, fall back to rules
    let scoredTasks: TaskWithScore[];
    let usedAI = false;

    if (lovableApiKey) {
      const aiResult = await scoreTasksWithAI(tasks, today, lovableApiKey, calendarEvents, calendarBusyness);
      if (aiResult && aiResult.length > 0) {
        scoredTasks = aiResult;
        usedAI = true;
      } else {
        scoredTasks = scoreTasksWithRules(tasks, today, calendarBusyness);
      }
    } else {
      scoredTasks = scoreTasksWithRules(tasks, today, calendarBusyness);
    }

    // Sort and take top tasks (AI already returns sorted, rules need sorting)
    // Adjust max tasks based on calendar busyness
    const maxTasks = calendarBusyness.busyLevel === 'packed' ? 4 
      : calendarBusyness.busyLevel === 'busy' ? 5 
      : 7;
    
    if (!usedAI) {
      scoredTasks.sort((a, b) => b.score - a.score);
    }
    const topTasks = scoredTasks.slice(0, maxTasks);

    // Create or update plan
    let planId: string;

    if (existingPlan) {
      await supabase
        .from("daily_plan_items")
        .delete()
        .eq("daily_plan_id", existingPlan.id);

      await supabase
        .from("daily_plans")
        .update({ 
          generated_at: new Date().toISOString(), 
          accepted: false,
          accepted_at: null,
        })
        .eq("id", existingPlan.id);

      planId = existingPlan.id;
    } else {
      const { data: newPlan } = await supabase
        .from("daily_plans")
        .insert({
          user_id: user.id,
          household_id: householdId,
          date: targetDate,
          accepted: false,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      planId = newPlan!.id;
    }

    // Insert plan items with AI reasoning
    const planItems = topTasks.map((item, index) => ({
      daily_plan_id: planId,
      task_id: item.task.id,
      score: item.score,
      position: index + 1,
      ai_reasoning: item.reasoning || null,
    }));

    await supabase.from("daily_plan_items").insert(planItems);

    return new Response(JSON.stringify({ 
      success: true, 
      planId, 
      taskCount: topTasks.length,
      usedAI
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    if ((error as any)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "AI service timed out. Please try again." }), { status: 408, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("Error generating daily plan:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
