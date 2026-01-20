import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    if (assignedTaskIds.length === 0) {
      // No tasks assigned - create empty plan or return
      if (existingPlan) {
        // Delete existing items
        await supabase
          .from("daily_plan_items")
          .delete()
          .eq("daily_plan_id", existingPlan.id);
        
        // Update plan
        await supabase
          .from("daily_plans")
          .update({ generated_at: new Date().toISOString(), accepted: false })
          .eq("id", existingPlan.id);
        
        return new Response(JSON.stringify({ 
          message: "Plan regenerated (no tasks)", 
          planId: existingPlan.id 
        }), {
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

      return new Response(JSON.stringify({ 
        message: "Plan created (no tasks)", 
        planId: newPlan?.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch tasks with open status
    const { data: tasks } = await supabase
      .from("tasks")
      .select("*")
      .in("id", assignedTaskIds)
      .in("task_status", ["backlog", "today", "in_progress", "blocked"])
      .eq("household_id", householdId);

    if (!tasks || tasks.length === 0) {
      // Same as above - empty plan
      if (existingPlan) {
        await supabase
          .from("daily_plan_items")
          .delete()
          .eq("daily_plan_id", existingPlan.id);
        
        await supabase
          .from("daily_plans")
          .update({ generated_at: new Date().toISOString(), accepted: false })
          .eq("id", existingPlan.id);
        
        return new Response(JSON.stringify({ 
          message: "Plan regenerated (no open tasks)", 
          planId: existingPlan.id 
        }), {
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

      return new Response(JSON.stringify({ 
        message: "Plan created (no open tasks)", 
        planId: newPlan?.id 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score each task
    const scoredTasks = tasks.map((task: any) => {
      let score = 0;

      // Priority weight: higher priority => higher score
      // priority_level 1 => +80, 2 => +60, 3 => +40, 4 => +20
      score += (5 - (task.priority_level || 3)) * 20;

      // Due date urgency
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 0) {
          // Overdue or due today
          score += 60;
        } else if (daysDiff <= 3) {
          score += 40;
        } else if (daysDiff <= 7) {
          score += 20;
        }
      }

      // Age factor (days since creation, capped at 10)
      const createdAt = new Date(task.created_at);
      const ageDays = Math.max(0, Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      score += Math.min(ageDays, 10) * 3; // up to +30

      // Status bias – encourage finishing started work
      if (task.task_status === "in_progress") {
        score += 25;
      }

      // Category tweak: slightly favor Kid-related tasks
      if (task.task_category === "kid") {
        score += 10;
      }

      return { task, score };
    });

    // Sort by score descending and take top 7
    scoredTasks.sort((a, b) => b.score - a.score);
    const topTasks = scoredTasks.slice(0, 7);

    // Create or update plan
    let planId: string;

    if (existingPlan) {
      // Delete existing items
      await supabase
        .from("daily_plan_items")
        .delete()
        .eq("daily_plan_id", existingPlan.id);

      // Update plan
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

    // Insert plan items
    const planItems = topTasks.map((item, index) => ({
      daily_plan_id: planId,
      task_id: item.task.id,
      score: item.score,
      position: index + 1,
    }));

    await supabase.from("daily_plan_items").insert(planItems);

    return new Response(JSON.stringify({ 
      success: true, 
      planId, 
      taskCount: topTasks.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error generating daily plan:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
