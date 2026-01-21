import { useState } from "react";
import { format } from "date-fns";
import { RefreshCw, Users, User } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHousehold } from "@/hooks/useHousehold";
import { useHabits } from "@/hooks/useHabits";
import { useHouseholdHabitStats } from "@/hooks/useHouseholdHabitStats";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitQuickAdd } from "@/components/habits/HabitQuickAdd";
import { HabitCoachInsight } from "@/components/habits/HabitCoachInsight";
import { HouseholdHabitSummary } from "@/components/habits/HouseholdHabitSummary";
import { MemberProgressCard } from "@/components/habits/MemberProgressCard";

const Habits = () => {
  const [view, setView] = useState<"personal" | "household">("personal");
  const { householdId, isLoading: householdLoading } = useHousehold();

  const { todaysHabits, isLoading: habitsLoading, createHabit, logHabit } = useHabits(householdId);
  const { data: householdStats, isLoading: statsLoading } = useHouseholdHabitStats(householdId);

  const today = new Date();
  const completedCount = todaysHabits.filter((h) => h.todayLog?.completed).length;
  const totalCount = todaysHabits.length;

  const handleToggleHabit = (habitId: string, completed: boolean) => {
    logHabit.mutate({ habitId, completed });
  };

  const handleUpdateValue = (habitId: string, value: number) => {
    logHabit.mutate({ habitId, completed: false, actualValue: value });
  };

  const handleAddHabit = (name: string) => {
    createHabit.mutate({ name });
  };

  if (householdLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pb-24">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-24 w-full" />
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Header with date and view toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Habits</h1>
            <p className="text-muted-foreground">
              {format(today, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => setView(v as "personal" | "household")}>
            <TabsList>
              <TabsTrigger value="personal" className="gap-2">
                <User className="h-4 w-4" />
                Me
              </TabsTrigger>
              <TabsTrigger value="household" className="gap-2">
                <Users className="h-4 w-4" />
                Household
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {view === "personal" ? (
          /* Personal View */
          <div className="space-y-4">
            {/* Progress summary */}
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Today's Progress</p>
                <p className="text-2xl font-bold">
                  {completedCount}/{totalCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold text-primary">
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </p>
              </div>
            </div>

            {/* AI Coach Insight */}
            {todaysHabits.length > 0 && completedCount < totalCount && (
              <HabitCoachInsight
                content="You're most consistent in the mornings. Try tackling your remaining habits early tomorrow!"
                onDismiss={() => {}}
              />
            )}

            {/* Habits list */}
            {habitsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : todaysHabits.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  You haven't created any habits yet.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Start building healthy routines for you and your family.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
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

            {/* Quick add */}
            <HabitQuickAdd onAdd={handleAddHabit} isLoading={createHabit.isPending} />
          </div>
        ) : (
          /* Household View */
          <div className="space-y-6">
            {statsLoading || !householdStats ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : (
              <>
                {/* Household summary */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">Today's Summary</h2>
                  <HouseholdHabitSummary stats={householdStats} />
                </div>

                {/* Member progress */}
                <div>
                  <h2 className="text-lg font-semibold mb-3">Member Progress</h2>
                  {householdStats.memberStats.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No household members with habits yet.
                    </p>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {householdStats.memberStats.map((member) => (
                        <MemberProgressCard key={member.userId} member={member} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Household coach insight */}
                {householdStats.memberStats.length > 0 && (
                  <HabitCoachInsight
                    content="Your household is showing great consistency! Consider adding a shared family habit like an evening walk."
                    onDismiss={() => {}}
                  />
                )}
              </>
            )}
          </div>
        )}
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
};

export default Habits;
