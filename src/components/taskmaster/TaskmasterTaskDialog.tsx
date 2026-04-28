import { useState, useEffect } from "react";
import { TaskmasterTask, TaskCategory, TaskStatus, Project } from "@/types/taskmaster";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/voice/VoiceInputButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TaskmasterTaskDialogProps {
  task?: TaskmasterTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Partial<TaskmasterTask> & { assignee_ids?: string[] }) => void;
  householdId: string;
  projects: Project[];
  defaultProjectId?: string;
}

export const TaskmasterTaskDialog = ({
  task,
  open,
  onOpenChange,
  onSave,
  householdId,
  projects,
  defaultProjectId,
}: TaskmasterTaskDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [category, setCategory] = useState<TaskCategory>("other");
  const [status, setStatus] = useState<TaskStatus>("backlog");
  const [priority, setPriority] = useState<number>(3);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setProjectId(task.project_id || "");
      setCategory(task.task_category || "other");
      setStatus(task.task_status || "backlog");
      setPriority(task.priority_level || 3);
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : "");
    } else {
      setTitle("");
      setDescription("");
      setProjectId(defaultProjectId || "");
      setCategory("other");
      setStatus("backlog");
      setPriority(3);
      setDueDate("");
    }
  }, [task, defaultProjectId, open]);

  const handleSave = () => {
    const taskData: Partial<TaskmasterTask> & { assignee_ids?: string[] } = {
      title,
      description: description || null,
      project_id: projectId || null,
      task_category: category,
      task_status: status,
      priority_level: priority,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      household_id: householdId,
      assignee_ids: user?.id ? [user.id] : [],
    };

    onSave(taskData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <div className="flex items-center gap-1.5">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="flex-1" />
              <VoiceInputButton
                onTranscript={(text) => setTitle((prev) => (prev ? prev + " " + text : text))}
                size="icon"
                variant="outline"
                title="Speak the task title"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <div className="flex items-start gap-1.5">
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task description (optional)" rows={2} className="flex-1" />
              <VoiceInputButton
                onTranscript={(text) => setDescription((prev) => (prev ? prev + " " + text : text))}
                size="icon"
                variant="outline"
                continuous
                title="Speak the description"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="No project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TaskCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="kid">Kid</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={priority.toString()} onValueChange={(v) => setPriority(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">P1 (Highest)</SelectItem>
                  <SelectItem value="2">P2</SelectItem>
                  <SelectItem value="3">P3</SelectItem>
                  <SelectItem value="4">P4 (Lowest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>{task ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
