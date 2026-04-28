import { useState } from "react";
import { Sparkles, X, Check, Pencil, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParseTask, ParsedTask } from "@/hooks/useParseTask";
import { format, parseISO } from "date-fns";
import { VoiceInputButton } from "@/components/voice/VoiceInputButton";

interface QuickTaskInputProps {
  onCreateTask: (task: ParsedTask) => void;
  onEditTask?: (task: ParsedTask) => void;
}

const getPriorityLabel = (level: number) => {
  switch (level) {
    case 1: return { label: "P1 Urgent", color: "text-red-600 bg-red-50 border-red-200" };
    case 2: return { label: "P2 High", color: "text-orange-600 bg-orange-50 border-orange-200" };
    case 3: return { label: "P3 Normal", color: "text-blue-600 bg-blue-50 border-blue-200" };
    case 4: return { label: "P4 Low", color: "text-gray-600 bg-gray-50 border-gray-200" };
    default: return { label: "P3 Normal", color: "text-blue-600 bg-blue-50 border-blue-200" };
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case "home": return { label: "Home", color: "bg-green-100 text-green-700" };
    case "work": return { label: "Work", color: "bg-purple-100 text-purple-700" };
    case "kid": return { label: "Kid", color: "bg-pink-100 text-pink-700" };
    default: return { label: "Other", color: "bg-gray-100 text-gray-700" };
  }
};

export const QuickTaskInput = ({ onCreateTask, onEditTask }: QuickTaskInputProps) => {
  const [input, setInput] = useState("");
  const [parsedTask, setParsedTask] = useState<ParsedTask | null>(null);
  const { parseTask } = useParseTask();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || parseTask.isPending) return;

    const result = await parseTask.mutateAsync(input.trim());
    setParsedTask(result);
  };

  const handleCreate = () => {
    if (parsedTask) {
      onCreateTask(parsedTask);
      setParsedTask(null);
      setInput("");
    }
  };

  const handleEdit = () => {
    if (parsedTask && onEditTask) {
      onEditTask(parsedTask);
      setParsedTask(null);
      setInput("");
    }
  };

  const handleCancel = () => {
    setParsedTask(null);
  };

  const priority = parsedTask ? getPriorityLabel(parsedTask.priority_level) : null;
  const category = parsedTask ? getCategoryLabel(parsedTask.task_category) : null;

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
              "Parse"
            )}
          </Button>
          </div>
        </div>
      </form>

      {parsedTask && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <h4 className="font-medium">{parsedTask.title}</h4>
                {parsedTask.description && (
                  <p className="text-sm text-muted-foreground">{parsedTask.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {category && (
                    <Badge variant="outline" className={category.color}>
                      {category.label}
                    </Badge>
                  )}
                  {priority && (
                    <Badge variant="outline" className={priority.color}>
                      {priority.label}
                    </Badge>
                  )}
                  {parsedTask.due_date && (
                    <Badge variant="outline">
                      Due: {format(parseISO(parsedTask.due_date), "MMM d")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {onEditTask && (
                  <Button size="icon" variant="ghost" onClick={handleEdit} title="Edit before creating">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={handleCancel} title="Cancel">
                  <X className="h-4 w-4" />
                </Button>
                <Button size="icon" onClick={handleCreate} title="Create task">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
