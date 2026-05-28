import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TaskmasterTaskDialog } from "@/components/taskmaster/TaskmasterTaskDialog";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useProjects } from "@/hooks/useProjects";
import { useCreateTransaction } from "@/hooks/finance";
import { useHabits } from "@/hooks/useHabits";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useEnabledProducts, isProductEnabled, ProductName } from "@/hooks/useEnabledProducts";
import type { TaskmasterTask } from "@/types/taskmaster";

interface Props {
  householdId: string;
}

export const QuickActionsRow = ({ householdId }: Props) => {
  const navigate = useNavigate();
  const [taskOpen, setTaskOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);

  const { createTask } = useTaskmaster(householdId);
  const { projects } = useProjects(householdId) as any;
  const createTransaction = useCreateTransaction(householdId);
  const { createHabit } = useHabits(householdId);
  const { data: members } = useHouseholdMembers(householdId);
  const { data: enabled } = useEnabledProducts(householdId);

  const showTasks = isProductEnabled(enabled, "tasks" as ProductName);
  const showFinance = isProductEnabled(enabled, "finance" as ProductName);
  const showHabits = isProductEnabled(enabled, "habits" as ProductName);
  const showGrocery = isProductEnabled(enabled, "grocery" as ProductName);

  const actions = [
    showTasks && {
      key: "task",
      emoji: "✅",
      label: "Task",
      onClick: () => setTaskOpen(true),
    },
    showFinance && {
      key: "expense",
      emoji: "₹",
      label: "Expense",
      onClick: () => setTxOpen(true),
    },
    showHabits && {
      key: "habit",
      emoji: "🌿",
      label: "Habit",
      onClick: () => setHabitOpen(true),
    },
    showGrocery && {
      key: "grocery",
      emoji: "🛒",
      label: "Grocery",
      onClick: () => navigate("/grocery?add=1"),
    },
  ].filter(Boolean) as Array<{
    key: string;
    emoji: string;
    label: string;
    onClick: () => void;
  }>;

  const handleSaveTask = (
    data: Partial<TaskmasterTask> & { assignee_ids?: string[] }
  ) => {
    createTask.mutate({ ...data, household_id: householdId } as any);
    setTaskOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {actions.map(({ key, emoji, label, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="fd-qa min-h-touch"
          >
            <span className="fd-qa-i" aria-hidden="true">{emoji}</span>
            <span className="fd-qa-l">{label}</span>
          </button>
        ))}
      </div>

      {showTasks && (
        <TaskmasterTaskDialog
          open={taskOpen}
          onOpenChange={setTaskOpen}
          onSave={handleSaveTask}
          householdId={householdId}
          projects={projects || []}
        />
      )}
      {showFinance && (
        <TransactionDialog
          open={txOpen}
          onOpenChange={setTxOpen}
          isSaving={createTransaction.isPending}
          onSave={(data) => {
            createTransaction.mutate(data);
            setTxOpen(false);
          }}
        />
      )}
      {showHabits && (
        <HabitCreateDialog
          onCreateHabit={(data) => {
            createHabit.mutate(data);
            setHabitOpen(false);
          }}
          isLoading={createHabit.isPending}
          householdMembers={(members || []).map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            avatarUrl: m.avatarUrl,
          }))}
          controlledOpen={habitOpen}
          onControlledOpenChange={setHabitOpen}
        />
      )}
    </>
  );
};