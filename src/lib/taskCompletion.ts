import { ParsedTask } from "@/hooks/useParseTask";
import { TaskCategory, TaskStatus } from "@/types/taskmaster";

/**
 * Tracks which fields of a parsed task were filled by the AI (suggestions
 * that the user should confirm) vs. truly missing (must be picked).
 */
export interface CompletionDraft {
  title: string;
  description: string | null;
  task_category: TaskCategory;
  priority_level: number;
  due_date: string | null;
  has_due_date: boolean; // user explicitly toggled "no due date" => false, with due_date null
  task_status: TaskStatus;
  project_id: string | null;
  assignee_ids: string[];
  // Tracking
  aiSuggested: {
    category: boolean;
    priority: boolean;
    status: boolean;
    due: boolean;
  };
  userConfirmed: {
    category: boolean;
    priority: boolean;
    status: boolean;
    due: boolean;
  };
}

export const buildDraftFromParsed = (
  parsed: ParsedTask,
  defaults: { creatorId?: string; defaultStatus?: TaskStatus }
): CompletionDraft => {
  const aiHasStatus = parsed.task_status != null;
  const aiHasDue = parsed.due_date != null;
  return {
    title: parsed.title,
    description: parsed.description,
    task_category: parsed.task_category ?? "other",
    priority_level: parsed.priority_level ?? 3,
    due_date: parsed.due_date,
    has_due_date: aiHasDue,
    task_status: parsed.task_status ?? defaults.defaultStatus ?? "backlog",
    project_id: null,
    assignee_ids: defaults.creatorId ? [defaults.creatorId] : [],
    aiSuggested: {
      category: true, // AI always returns a category
      priority: true, // AI always returns a priority
      status: aiHasStatus,
      due: aiHasDue,
    },
    userConfirmed: {
      category: false,
      priority: false,
      status: false,
      due: false,
    },
  };
};

/**
 * Required fields are "ready" only when they have a value AND the user has
 * either confirmed the AI suggestion or set their own.
 */
export const isDraftReady = (d: CompletionDraft): boolean => {
  if (!d.title.trim()) return false;
  if (!d.userConfirmed.category) return false;
  if (!d.userConfirmed.priority) return false;
  if (!d.userConfirmed.status) return false;
  // Due needs explicit answer: a date or "no due date" toggle off
  if (!d.userConfirmed.due) return false;
  return true;
};

export const missingFieldLabels = (d: CompletionDraft): string[] => {
  const out: string[] = [];
  if (!d.userConfirmed.category) out.push("Category");
  if (!d.userConfirmed.priority) out.push("Priority");
  if (!d.userConfirmed.status) out.push("Status");
  if (!d.userConfirmed.due) out.push("Due date");
  return out;
};