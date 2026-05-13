import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { TaskmasterSubNav } from "@/components/taskmaster/TaskmasterSubNav";
import { TemplatePreviewSheet } from "@/components/taskmaster/TemplatePreviewSheet";
import { TASK_TEMPLATES, type TaskTemplate, type TaskTemplateItem } from "@/data/taskTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/hooks/useHousehold";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { addDays } from "date-fns";

const TaskmasterTemplates = () => {
  const navigate = useNavigate();
  const { householdId } = useHousehold();
  const { bulkCreateFromTemplate } = useTaskmaster(householdId);
  const [selected, setSelected] = useState<TaskTemplate | null>(null);
  const [open, setOpen] = useState(false);

  const handleConfirm = async (projectName: string, items: TaskTemplateItem[]) => {
    const today = new Date();
    const result = await bulkCreateFromTemplate.mutateAsync({
      projectName,
      items: items.map((it) => ({
        title: it.title,
        task_category: it.category,
        priority_level: it.priority,
        due_date:
          it.dueOffsetDays != null
            ? addDays(today, it.dueOffsetDays).toISOString()
            : null,
        recurring: !!it.recurring,
        recurring_pattern: it.recurring ?? null,
      })),
    });
    setOpen(false);
    if (result?.project?.id) navigate(`/taskmaster/projects/${result.project.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <main className="max-w-[1200px] mx-auto px-4 pt-4">
        <TaskmasterSubNav />

        <div className="mt-6 mb-4">
          <h1 className="text-xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Pre-built task sets for common Indian household routines.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TASK_TEMPLATES.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => {
                setSelected(t);
                setOpen(true);
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="text-xl">{t.emoji}</span>
                  {t.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {t.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t.items.length} tasks
                  </span>
                  <Button size="sm" variant="outline">
                    Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      <TemplatePreviewSheet
        template={selected}
        open={open}
        onOpenChange={setOpen}
        onConfirm={handleConfirm}
        isPending={bulkCreateFromTemplate.isPending}
      />
    </div>
  );
};

export default TaskmasterTemplates;