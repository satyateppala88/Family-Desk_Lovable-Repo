import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Handles deep-link query params produced by service-worker notification
 * action buttons (see `src/sw.ts` `notificationclick` handler).
 *
 * Recognised actions on the URL `?action=...&task_id=...&habit_id=...`:
 *   - `complete`  — marks the task as completed
 *   - `snooze`    — pushes the task's due_date out by 1 hour
 *   - `log`       — logs a habit completion for today
 *
 * After handling, the query string is stripped so a page refresh doesn't
 * re-trigger the action.
 */
export function useNotificationActionHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    if (!action) return;

    const taskId = params.get("task_id");
    const habitId = params.get("habit_id");

    let cancelled = false;

    const run = async () => {
      try {
        if (action === "complete" && taskId) {
          const { error } = await supabase
            .from("tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", taskId);
          if (error) throw error;
          if (!cancelled) toast.success("Task marked complete");
        } else if (action === "snooze" && taskId) {
          // Push due date out by 1 hour.
          const { data: task } = await supabase
            .from("tasks")
            .select("due_date")
            .eq("id", taskId)
            .maybeSingle();
          const base = task?.due_date ? new Date(task.due_date) : new Date();
          base.setHours(base.getHours() + 1);
          const { error } = await supabase
            .from("tasks")
            .update({ due_date: base.toISOString() })
            .eq("id", taskId);
          if (error) throw error;
          if (!cancelled) toast.success("Snoozed for 1 hour");
        } else if (action === "log" && habitId) {
          const today = new Date().toISOString().slice(0, 10);
          const { data: userData } = await supabase.auth.getUser();
          const userId = userData.user?.id;
          if (!userId) return;
          const { error } = await supabase
            .from("habit_logs")
            .upsert(
              {
                habit_id: habitId,
                user_id: userId,
                log_date: today,
                completed: true,
              },
              { onConflict: "habit_id,user_id,log_date" }
            );
          if (error) throw error;
          if (!cancelled) toast.success("Habit logged for today");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[notification-action] failed:", err);
          toast.error("Couldn't complete that action.");
        }
      } finally {
        // Strip the action params so a refresh doesn't repeat the work.
        if (!cancelled) {
          const next = new URLSearchParams(location.search);
          next.delete("action");
          next.delete("task_id");
          next.delete("habit_id");
          const qs = next.toString();
          navigate(`${location.pathname}${qs ? `?${qs}` : ""}`, {
            replace: true,
          });
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
}