import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskWithScore {
  task: any;
  score: number;
  reasoning?: string;
}

// Fallback rule-based scoring when AI is unavailable
function scoreTasksWithRules(tasks: any[], today: Date): TaskWithScore[] {
  return tasks.map((task: any) => {
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

    // Category tweak
    if (task.task_category === "kid") {
      score += 10;
      if (!reasons.includes("Kid-related")) reasons.push("Kid-related");
    }

    return { 
      task, 
      score, 
      reasoning: reasons.length > 0 ? reasons.join(" • ") : "Balanced priority"
    };
  });
}

// AI-powered smart prioritization
async function scoreTasksWithAI(
  tasks: any[], 
  today: Date,
  apiKey: string
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

    const systemPrompt = `You are a smart task prioritization assistant helping a busy family manage their day.

Today's date is ${today.toISOString().split("T")[0]}.

Analyze the provided tasks and select the top 7 most important tasks for today. Consider:
1. **Urgency**: Overdue and due-soon tasks should be prioritized
2. **Priority level**: P1 (critical) > P2 (high) > P3 (normal) > P4 (low)
3. **Work continuity**: Tasks already in_progress should often be completed
4. **Balance**: Try to include a mix of categories when possible
5. **Task age**: Older tasks shouldn't be forgotten
6. **Family context**: Kid-related tasks often have fixed timings

For each selected task, provide a brief, friendly reasoning (under 10 words) explaining why it's prioritized.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are my open tasks:\n${JSON.stringify(taskSummaries, null, 2)}\n\nSelect and prioritize the top 7 tasks for today.` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "select_daily_tasks",
              description: "Select and prioritize tasks for today's plan",
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
                          description: "Brief explanation why this task is prioritized (under 10 words)" 
                        }
                      },
                      required: ["task_id", "position", "reasoning"]
                    },
                    description: "Array of selected tasks in priority order, max 7 tasks"
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

    // Map AI selections back to tasks
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const scoredTasks: TaskWithScore[] = [];

    for (const selection of selectedTasks) {
      const task = taskMap.get(selection.task_id);
      if (task) {
        scoredTasks.push({
          task,
          score: 100 - (selection.position * 10), // Higher position = higher score
          reasoning: selection.reasoning
        });
      }
    }

    return scoredTasks.length > 0 ? scoredTasks : null;
  } catch (error) {
    console.error("AI scoring failed:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date, forceRegenerate, householdId } = await req.json();
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

    // Try AI-powered scoring first, fall back to rules
    let scoredTasks: TaskWithScore[];
    let usedAI = false;

    if (lovableApiKey) {
      const aiResult = await scoreTasksWithAI(tasks, today, lovableApiKey);
      if (aiResult && aiResult.length > 0) {
        scoredTasks = aiResult;
        usedAI = true;
      } else {
        scoredTasks = scoreTasksWithRules(tasks, today);
      }
    } else {
      scoredTasks = scoreTasksWithRules(tasks, today);
    }

    // Sort and take top 7 (AI already returns sorted, rules need sorting)
    if (!usedAI) {
      scoredTasks.sort((a, b) => b.score - a.score);
    }
    const topTasks = scoredTasks.slice(0, 7);

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
    console.error("Error generating daily plan:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
