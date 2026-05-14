import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Sparkles, Users, AlertCircle, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ParsedTask } from "@/hooks/useParseTask";
import { TaskCategory, TaskStatus, Project } from "@/types/taskmaster";
import {
  CompletionDraft,
  buildDraftFromParsed,
  isDraftReady,
  missingFieldLabels,
} from "@/lib/taskCompletion";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { RecurrenceSelector } from "@/components/taskmaster/RecurrenceSelector";

interface TaskCompletionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsed: ParsedTask | null;
  householdId: string | null;
  projects: Project[];
  defaultStatus?: TaskStatus;
  creatorId?: string;
  onConfirm: (draft: CompletionDraft) => void;
}

const AiSuggestedBadge = ({
  confirmed,
  onConfirm,
}: {
  confirmed: boolean;
  onConfirm?: () => void;
}) =>
  confirmed ? (
    <Badge
      variant="outline"
      className="shrink-0 gap-1 text-[10px] border-green-500/40 text-green-700 bg-green-50"
    >
      <Check className="h-3 w-3" /> Confirmed
    </Badge>
  ) : (
    <button
      type="button"
      onClick={onConfirm}
      className="shrink-0 inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <Sparkles className="h-3 w-3" /> AI suggested — tap to confirm
    </button>
  );

const MissingHint = () => (
  <Badge variant="outline" className="gap-1 text-[10px] border-red-500/40 text-red-700 bg-red-50">
    <AlertCircle className="h-3 w-3" /> Pick one
  </Badge>
);

export const TaskCompletionSheet = ({
  open,
  onOpenChange,
  parsed,
  householdId,
  projects,
  defaultStatus,
  creatorId,
  onConfirm,
}: TaskCompletionSheetProps) => {
  const { data: members = [] } = useHouseholdMembers(householdId);
  const [draft, setDraft] = useState<CompletionDraft | null>(null);

  useEffect(() => {
    if (open && parsed) {
      setDraft(buildDraftFromParsed(parsed, { creatorId, defaultStatus }));
    }
  }, [open, parsed, creatorId, defaultStatus]);

  if (!draft) return null;

  const ready = isDraftReady(draft);
  const missing = missingFieldLabels(draft);

  const update = (patch: Partial<CompletionDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const confirmField = (key: keyof CompletionDraft["userConfirmed"]) =>
    setDraft((d) =>
      d ? { ...d, userConfirmed: { ...d.userConfirmed, [key]: true } } : d
    );

  const toggleAssignee = (userId: string) => {
    setDraft((d) => {
      if (!d) return d;
      const has = d.assignee_ids.includes(userId);
      return {
        ...d,
        assignee_ids: has
          ? d.assignee_ids.filter((id) => id !== userId)
          : [...d.assignee_ids, userId],
      };
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-6 pt-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">Complete task details</SheetTitle>
          <SheetDescription className="text-xs">
            Confirm the highlighted fields so the task lands on the right list.
            Visible to everyone in your household.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="tc-title">Title</Label>
            <Input
              id="tc-title"
              value={draft.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="tc-desc" className="text-xs text-muted-foreground">
              Description (optional)
            </Label>
            <Textarea
              id="tc-desc"
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) =>
                update({ description: e.target.value || null })
              }
            />
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <Label>Status</Label>
              {draft.aiSuggested.status ? (
                <AiSuggestedBadge
                  confirmed={draft.userConfirmed.status}
                  onConfirm={() => confirmField("status")}
                />
              ) : !draft.userConfirmed.status ? (
                <MissingHint />
              ) : null}
            </div>
            <Select
              value={draft.task_status}
              onValueChange={(v) => {
                update({ task_status: v as TaskStatus });
                confirmField("status");
              }}
              onOpenChange={(open) => {
                if (!open) confirmField("status");
              }}
            >
              <SelectTrigger
                className={cn(
                  !draft.userConfirmed.status && "border-amber-400/60"
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <Label>Category</Label>
                <AiSuggestedBadge
                  confirmed={draft.userConfirmed.category}
                  onConfirm={() => confirmField("category")}
                />
              </div>
              <Select
                value={draft.task_category}
                onValueChange={(v) => {
                  update({ task_category: v as TaskCategory });
                  confirmField("category");
                }}
                onOpenChange={(open) => {
                  if (!open) confirmField("category");
                }}
              >
                <SelectTrigger
                  className={cn(
                    !draft.userConfirmed.category && "border-amber-400/60"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="kid">Kid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <Label>Priority</Label>
                <AiSuggestedBadge
                  confirmed={draft.userConfirmed.priority}
                  onConfirm={() => confirmField("priority")}
                />
              </div>
              <Select
                value={draft.priority_level.toString()}
                onValueChange={(v) => {
                  update({ priority_level: parseInt(v) });
                  confirmField("priority");
                }}
                onOpenChange={(open) => {
                  if (!open) confirmField("priority");
                }}
              >
                <SelectTrigger
                  className={cn(
                    !draft.userConfirmed.priority && "border-amber-400/60"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  <SelectItem value="1">P1 Urgent</SelectItem>
                  <SelectItem value="2">P2 High</SelectItem>
                  <SelectItem value="3">P3 Normal</SelectItem>
                  <SelectItem value="4">P4 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <Label>Due date</Label>
              {draft.aiSuggested.due ? (
                <AiSuggestedBadge
                  confirmed={draft.userConfirmed.due}
                  onConfirm={() => confirmField("due")}
                />
              ) : !draft.userConfirmed.due ? (
                <MissingHint />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!draft.has_due_date}
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !draft.userConfirmed.due && "border-amber-400/60",
                      !draft.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {draft.due_date
                      ? format(new Date(draft.due_date), "PPP")
                      : draft.has_due_date
                      ? "Pick a date"
                      : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={draft.due_date ? new Date(draft.due_date) : undefined}
                    onSelect={(d) => {
                      if (!d) return;
                      const iso = d.toISOString().split("T")[0];
                      update({ due_date: iso, has_due_date: true });
                      confirmField("due");
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2">
                <Switch
                  id="tc-has-due"
                  checked={draft.has_due_date}
                  onCheckedChange={(checked) => {
                    update({
                      has_due_date: checked,
                      due_date: checked ? draft.due_date : null,
                    });
                    confirmField("due");
                  }}
                />
                <Label htmlFor="tc-has-due" className="text-xs">
                  Has due date
                </Label>
              </div>
            </div>
          </div>

          {/* Project (optional) */}
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              Project (optional)
            </Label>
            <Select
              value={draft.project_id ?? "none"}
              onValueChange={(v) =>
                update({ project_id: v === "none" ? null : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent className="z-[60]">
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Repeat */}
          <RecurrenceSelector
            value={draft.recurring_pattern}
            onChange={(p) =>
              update({ recurring: !!p, recurring_pattern: p })
            }
          />

          {/* Assignees */}
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Assigned to
            </Label>
            <div className="flex flex-wrap gap-2">
              {members.length === 0 && (
                <span className="text-xs text-muted-foreground">
                  Just you
                </span>
              )}
              {members.map((m) => {
                const checked = draft.assignee_ids.includes(m.userId);
                return (
                  <button
                    type="button"
                    key={m.userId}
                    onClick={() => toggleAssignee(m.userId)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    <Checkbox checked={checked} className="pointer-events-none h-3 w-3" />
                    {m.displayName}
                    {m.userId === creatorId && " (you)"}
                  </button>
                );
              })}
            </div>
          </div>

          {!ready && missing.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Please confirm: {missing.join(", ")}.
            </p>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!ready || !draft.title.trim()}
            onClick={() => {
              if (!draft) return;
              onConfirm(draft);
              onOpenChange(false);
            }}
          >
            Create task
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};