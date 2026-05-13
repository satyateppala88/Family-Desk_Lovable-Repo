import { useState } from "react";
import { format } from "date-fns";
import { Users, User, Leaf, PartyPopper } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { useHousehold } from "@/hooks/useHousehold";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useHabits } from "@/hooks/useHabits";
import { useHouseholdHabitStats } from "@/hooks/useHouseholdHabitStats";
import { useHabitLeaderboard } from "@/hooks/useHabitLeaderboard";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { HabitCoachInsight } from "@/components/habits/HabitCoachInsight";
import { HouseholdHabitSummary } from "@/components/habits/HouseholdHabitSummary";
import { MemberProgressCard } from "@/components/habits/MemberProgressCard";
import { HabitLeaderboard } from "@/components/habits/HabitLeaderboard";
import { HabitAssignmentType, HabitFrequencyType } from "@/types/habits";
import { cn } from "@/lib/utils";

const Habits = () => {
  const [view, setView] = useState<"personal" | "household">("personal");
  const { householdId, isLoading: householdLoading } = useHousehold();
  useRealtimeSubscription([
    { table: "habits", filter: householdId ? `household_id=eq.${householdId}` : undefined, enabled: !!householdId, queryKeys: [["habits", householdId], ["habit-assignees", householdId]] },
    { table: "habit_logs", enabled: !!householdId, queryKeys: [["habit-logs-today"], ["household-habit-stats"], ["habit-leaderboard"], ["habit-scores"]] },
    { table: "habit_streaks", enabled: !!householdId, queryKeys: [["habit-streaks"]] },
  ]);

  const { todaysHabits, isLoading: habitsLoading, createHabit, logHabit } = useHabits(householdId);
  const { data: householdStats, isLoading: statsLoading } = useHouseholdHabitStats(householdId);
  const { data: leaderboardEntries, isLoading: leaderboardLoading } = useHabitLeaderboard(householdId);
  const { data: householdMembers } = useHouseholdMembers(householdId);

  const today = new Date();
  const completedCount = todaysHabits.filter((h) => h.todayLog?.completed).length;
  const totalCount = todaysHabits.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const handleToggleHabit = (habitId: string, completed: boolean) => {
    logHabit.mutate({ habitId, completed });
  };

  const handleUpdateValue = (habitId: string, value: number) => {
    logHabit.mutate({ habitId, completed: false, actualValue: value });
  };

  const handleCreateHabit = (data: {
    name: string;
    assignment_type: HabitAssignmentType;
    assigned_members?: string[];
    frequency_type: HabitFrequencyType;
    frequency_days: number[];
    target_value?: number;
    target_unit?: string;
    reminder_time?: string;
  }) => {
    createHabit.mutate(data);
  };

  if (householdLoading) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <PageLoading cards={3} />
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />

      <main className="page-content">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="page-heading">Habits</h1>
            <p className="text-muted-foreground text-sm">
              {format(today, "EEEE, MMMM d")}
            </p>
          </div>
          <div data-tour="view-toggle">
            <Tabs value={view} onValueChange={(v) => setView(v as "personal" | "household")}>
              <TabsList>
                <TabsTrigger value="personal" className="gap-1.5">
                  <User className="h-4 w-4" aria-hidden="true" />
                  Me
                </TabsTrigger>
                <TabsTrigger value="household" className="gap-1.5">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Household
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {view === "personal" ? (
          <div className="space-y-3">
            {/* Progress summary */}
            <Card data-tour="progress-summary" className={cn(allDone && "border-[hsl(var(--success))]/20 bg-[hsl(var(--success))]/3")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-label">Today's Progress</p>
                    <p className="text-2xl font-bold mt-0.5">
                      {completedCount}/{totalCount}
                    </p>
                  </div>
                  <div className="text-right">
                    {allDone ? (
                      <div className="flex items-center gap-1.5 animate-celebrate-pop">
                        <PartyPopper className="h-5 w-5 text-[hsl(var(--success))]" aria-hidden="true" />
                        <span className="text-sm font-semibold text-[hsl(var(--success))]">All done!</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-label">Completion</p>
                        <p className={cn(
                          "text-2xl font-bold mt-0.5",
                          completionPct >= 80 ? "text-[hsl(var(--success))]" : completionPct >= 40 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {completionPct}%
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {todaysHabits.length > 0 && completedCount < totalCount && completedCount > 0 && (
              <HabitCoachInsight
                content="You're making progress! Keep the momentum going — every check-off counts."
                onDismiss={() => {}}
              />
            )}

            {habitsLoading ? (
              <PageLoading cards={3} heading={false} />
            ) : todaysHabits.length === 0 ? (
              <EmptyState
                icon={Leaf}
                title="No habits yet"
                description="Small daily actions add up to big changes."
                encouragement="What's one thing you'd like to do every day?"
              />
            ) : (
              <div className="space-y-3" data-tour="habit-list">
                {todaysHabits.map((habit) => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onToggle={handleToggleHabit}
                    onUpdateValue={handleUpdateValue}
                  />
                ))}
              </div>
            )}

            <div data-tour="create-habit">
              <HabitCreateDialog
                onCreateHabit={handleCreateHabit}
                isLoading={createHabit.isPending}
                householdMembers={householdMembers}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {statsLoading || !householdStats ? (
              <PageLoading cards={3} heading={false} />
            ) : (
              <>
                <div>
                  <h2 className="text-section-title mb-3">Today's Summary</h2>
                  <HouseholdHabitSummary stats={householdStats} />
                </div>

                <HabitLeaderboard
                  entries={leaderboardEntries || []}
                  isLoading={leaderboardLoading}
                  period="weekly"
                />

                <div>
                  <h2 className="text-section-title mb-3">Member Progress</h2>
                  {householdStats.memberStats.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No member data yet"
                      description="Once household members start tracking habits, their progress will show here."
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {householdStats.memberStats.map((member) => (
                        <MemberProgressCard key={member.userId} member={member} />
                      ))}
                    </div>
                  )}
                </div>

                {householdStats.memberStats.length > 0 && (
                  <HabitCoachInsight
                    content="Your household is building great consistency! Consider adding a shared family habit like an evening walk or gratitude moment."
                    onDismiss={() => {}}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

import { ModuleSetupGate } from "@/components/onboarding/ModuleSetupGate";
const HabitsWithGate = () => (
  <ModuleSetupGate module="habits_setup">
    <Habits />
  </ModuleSetupGate>
);
export default HabitsWithGate;
