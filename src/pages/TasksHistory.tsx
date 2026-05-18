import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 30;

interface CompletedTaskRow {
  id: string;
  title: string;
  completed_at: string | null;
  updated_at: string | null;
  created_at: string;
  assignees?: Array<{
    user_id: string;
    profile?: { display_name: string | null; avatar_url: string | null } | null;
  }>;
}

const TasksHistory = () => {
  const { householdId, isLoading: loadingHousehold } = useHousehold();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["taskmaster-tasks-history", householdId, page],
    queryFn: async () => {
      if (!householdId) return { rows: [] as CompletedTaskRow[], total: 0 };
      // Fetch from the start up to the current page so "Load more" accumulates naturally.
      const to = (page + 1) * PAGE_SIZE - 1;
      const { data: tasks, count, error } = await supabase
        .from("tasks")
        .select("id, title, completed_at, updated_at, created_at", { count: "exact" })
        .eq("household_id", householdId)
        .eq("task_status", "done")
        .order("completed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .range(0, to);
      if (error) throw error;

      const taskIds = (tasks ?? []).map((t: any) => t.id);
      let assignees: any[] = [];
      let profilesById: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (taskIds.length > 0) {
        const { data: assigneeRows } = await supabase
          .from("task_assignees")
          .select("task_id, user_id")
          .in("task_id", taskIds);
        assignees = assigneeRows ?? [];
        const userIds = Array.from(new Set(assignees.map((a) => a.user_id)));
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", userIds);
          (profiles ?? []).forEach((p: any) => {
            profilesById[p.id] = { display_name: p.display_name, avatar_url: p.avatar_url };
          });
        }
      }

      const rows: CompletedTaskRow[] = (tasks ?? []).map((t: any) => ({
        ...t,
        assignees: assignees
          .filter((a) => a.task_id === t.id)
          .map((a) => ({ user_id: a.user_id, profile: profilesById[a.user_id] ?? null })),
      }));
      return { rows, total: count ?? 0 };
    },
    enabled: !!householdId,
    staleTime: 60 * 1000,
  });

  const allRows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const hasMore = (page + 1) * PAGE_SIZE < total;

  // Group by month label using completed_at (fallback to updated_at/created_at).
  const groups: Array<{ label: string; items: CompletedTaskRow[] }> = [];
  for (const row of allRows) {
    const date = new Date(row.completed_at ?? row.updated_at ?? row.created_at);
    const label = format(date, "MMMM yyyy");
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(row);
    } else {
      groups.push({ label, items: [row] });
    }
  }

  if (loadingHousehold || (isLoading && page === 0)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container px-4 sm:px-6 py-6 pb-24">
          <Skeleton className="h-7 w-48 mb-6" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 sm:px-6 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Completed Tasks</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {total > 0 ? `${total} completed ${total === 1 ? "task" : "tasks"}` : "Your task history"}
          </p>
        </div>

        {allRows.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No completed tasks yet"
            description="Tasks you complete will appear here."
          />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  {group.label}
                </h2>
                <ul className="divide-y rounded-lg border bg-card">
                  {group.items.map((task) => {
                    const dateStr = task.completed_at
                      ? format(new Date(task.completed_at), "d MMM")
                      : null;
                    return (
                      <li key={task.id} className="flex items-center gap-3 px-4 py-3">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground line-through truncate">
                            {task.title}
                          </p>
                          {dateStr && (
                            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                              Completed {dateStr}
                            </p>
                          )}
                        </div>
                        {task.assignees && task.assignees.length > 0 && (
                          <div className="flex -space-x-2">
                            {task.assignees.slice(0, 3).map((a) => {
                              const name = a.profile?.display_name || "?";
                              const initials = name
                                .split(/\s+/)
                                .filter(Boolean)
                                .map((p) => p[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2);
                              return (
                                <Avatar key={a.user_id} className="h-6 w-6 ring-2 ring-card">
                                  {a.profile?.avatar_url ? (
                                    <AvatarImage src={a.profile.avatar_url} alt={name} />
                                  ) : null}
                                  <AvatarFallback className="text-[10px] bg-muted">
                                    {initials || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              );
                            })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading…" : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TasksHistory;