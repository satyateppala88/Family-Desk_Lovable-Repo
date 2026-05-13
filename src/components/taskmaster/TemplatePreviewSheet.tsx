import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { describeRecurrence } from "@/lib/recurrence";
import type { TaskTemplate, TaskTemplateItem } from "@/data/taskTemplates";

interface Props {
  template: TaskTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (projectName: string, items: TaskTemplateItem[]) => void;
  isPending?: boolean;
}

export const TemplatePreviewSheet = ({
  template,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: Props) => {
  const [projectName, setProjectName] = useState("");
  const [items, setItems] = useState<TaskTemplateItem[]>([]);

  useEffect(() => {
    if (open && template) {
      setProjectName(template.name);
      setItems(template.items.map((i) => ({ ...i })));
    }
  }, [open, template]);

  if (!template) return null;

  const updateItem = (i: number, patch: Partial<TaskTemplateItem>) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  };
  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  const addItem = () =>
    setItems((prev) => [...prev, { title: "", category: "other", priority: 3 }]);

  const canConfirm =
    projectName.trim().length > 0 &&
    items.length > 0 &&
    items.every((i) => i.title.trim().length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-2xl px-4 pb-6 pt-4"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="text-base">
            {template.emoji} {template.name}
          </SheetTitle>
          <SheetDescription className="text-xs">
            Edit or remove tasks before adding them to a new project.
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Project name</Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">
              Tasks ({items.length})
            </Label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-md border bg-card p-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={it.title}
                      onChange={(e) => updateItem(i, { title: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(i)}
                      aria-label="Remove task"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  {it.recurring && (
                    <p className="text-[11px] text-muted-foreground pl-1">
                      ↺ {describeRecurrence(it.recurring)}
                    </p>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" /> Add task
              </Button>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canConfirm || isPending}
            onClick={() => onConfirm(projectName.trim(), items)}
          >
            Use Template
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};