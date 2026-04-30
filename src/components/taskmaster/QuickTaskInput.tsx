import { useState } from "react";
import { Sparkles, Loader2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useParseTask, ParsedTask } from "@/hooks/useParseTask";
import { VoiceInputButton } from "@/components/voice/VoiceInputButton";
import { TaskCompletionSheet } from "@/components/taskmaster/TaskCompletionSheet";
import { CompletionDraft } from "@/lib/taskCompletion";
import { Project, TaskStatus } from "@/types/taskmaster";

interface QuickTaskInputProps {
  onCreateTask: (draft: CompletionDraft) => void;
  householdId: string | null;
  projects?: Project[];
  defaultStatus?: TaskStatus;
  creatorId?: string;
}

export const QuickTaskInput = ({
  onCreateTask,
  householdId,
  projects = [],
  defaultStatus,
  creatorId,
}: QuickTaskInputProps) => {
  const [input, setInput] = useState("");
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const { parseTask } = useParseTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || parseTask.isPending) return;

    const result = await parseTask.mutateAsync(input.trim());
    setParsedTask(result);
    setSheetOpen(true);
  };

  const handleConfirm = (draft: CompletionDraft) => {
    onCreateTask(draft);
    setParsedTask(null);
    setInput("");
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type naturally: 'Call mom tomorrow' or 'Fix tap, urgent'"
            className="pl-10 pr-32"
            disabled={parseTask.isPending}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <VoiceInputButton
              onTranscript={(text) =>
                setInput((prev) => (prev ? prev + " " + text : text))
              }
              size="icon"
              variant="ghost"
              disabled={parseTask.isPending}
              className="h-7 w-7"
              title="Speak the task"
            />
            <Button
            type="submit"
            size="sm"
            disabled={!input.trim() || parseTask.isPending}
              className="h-7"
          >
            {parseTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Next"
            )}
          </Button>
          </div>
        </div>
      </form>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1 px-1">
        <Users className="h-3 w-3" />
        We'll ask you to confirm a few details so the task lands on the right list. Visible to everyone in your household.
      </p>

      <TaskCompletionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        parsed={parsedTask}
        householdId={householdId}
        projects={projects}
        defaultStatus={defaultStatus}
        creatorId={creatorId}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
