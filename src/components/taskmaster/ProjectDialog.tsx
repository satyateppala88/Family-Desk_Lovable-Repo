import { useState, useEffect } from "react";
import { Project, ProjectType, ProjectStatus } from "@/types/taskmaster";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProjectDialogProps {
  project?: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (project: Partial<Project>) => void;
}

export const ProjectDialog = ({ project, open, onOpenChange, onSave }: ProjectDialogProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ProjectType>("other");
  const [status, setStatus] = useState<ProjectStatus>("planning");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (project) {
      setName(project.name || "");
      setDescription(project.description || "");
      setType(project.type || "other");
      setStatus(project.status || "planning");
      setTargetDate(project.target_date ? new Date(project.target_date).toISOString().split("T")[0] : "");
    } else {
      setName("");
      setDescription("");
      setType("other");
      setStatus("planning");
      setTargetDate("");
    }
  }, [project, open]);

  const handleSave = () => {
    onSave({
      name,
      description: description || null,
      type,
      status,
      target_date: targetDate || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Create Project"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as ProjectType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Target Date</Label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>{project ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
