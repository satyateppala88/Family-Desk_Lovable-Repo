import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Users, User } from "lucide-react";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useHousehold } from "@/hooks/useHousehold";
import { useHabits } from "@/hooks/useHabits";
import { useHouseholdHabitStats } from "@/hooks/useHouseholdHabitStats";
import { useHabitLeaderboard } from "@/hooks/useHabitLeaderboard";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitCreateDialog } from "@/components/habits/HabitCreateDialog";
import { HabitCoachInsight } from "@/components/habits/HabitCoachInsight";
import { HouseholdHabitSummary } from "@/components/habits/HouseholdHabitSummary";
import { MemberProgressCard } from "@/components/habits/MemberProgressCard";
import { HabitLeaderboard } from "@/components/habits/HabitLeaderboard";
import { HabitAssignmentType, HabitFrequencyType } from "@/types/habits";
import type { Step } from "react-joyride";

const habitsTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Habits! Build healthy routines for you and your family.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='view-toggle']",
    content: "Switch between your personal habits and household-wide progress.",
    placement: "bottom",
  },
  {
    target: "[data-tour='progress-summary']",
    content: "Track your daily progress and completion rate.",
    placement: "bottom",
  },
  {
    target: "[data-tour='habit-list']",
    content: "Check off habits as you complete them. Track streaks and consistency.",
    placement: "top",
  },
  {
    target: "[data-tour='create-habit']",
    content: "Create personal or household habits with reminders and target values.",
    placement: "top",
  },
  {
    target: ".user-menu",
    content: "Access settings and restart this tour anytime from the User Guide menu.",
    placement: "bottom",
  },
];

const Habits = () => {
  const [view, setView] = useState<"personal" | "household">("personal");
  const { householdId, isLoading: householdLoading } = useHousehold();

  const { todaysHabits, isLoading: habitsLoading, createHabit, logHabit } = useHabits(householdId);
  const { data: householdStats, isLoading: statsLoading } = useHouseholdHabitStats(householdId);
  const { data: leaderboardEntries, isLoading: leaderboardLoading } = useHabitLeaderboard(householdId);
  const { data: householdMembers } = useHouseholdMembers(householdId);

  // Feature-specific tour
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("habits");
  const [runOnboarding, setRunOnboarding] = useState(false);

  // Start tour automatically if user hasn't seen it
  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

  const today = new Date();
  const completedCount = todaysHabits.filter((h) => h.todayLog?.completed).length;
  const totalCount = todaysHabits.length;

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
      <Header onStartOnboarding={handleStartOnboarding} />

      <main className="flex-1 container max-w-4xl mx-auto px-4 py-3 sm:py-4 pb-24">
        {/* Header with date and view toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Habits</h1>
            <p className="text-muted-foreground">
              {format(today, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <div data-tour="view-toggle">
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
        </div>

        {view === "personal" ? (
          /* Personal View */
          <div className="space-y-3">
            {/* Progress summary */}
            <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg" data-tour="progress-summary">
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

            {/* Create Habit Dialog */}
            <div data-tour="create-habit">
              <HabitCreateDialog
                onCreateHabit={handleCreateHabit}
                isLoading={createHabit.isPending}
                householdMembers={householdMembers}
              />
            </div>
          </div>
        ) : (
          /* Household View */
          <div className="space-y-4">
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

                {/* Leaderboard */}
                <HabitLeaderboard
                  entries={leaderboardEntries || []}
                  isLoading={leaderboardLoading}
                  period="weekly"
                />

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

      <OnboardingTour
        run={runOnboarding}
        onComplete={handleOnboardingComplete}
        steps={habitsTourSteps}
        featureName="habits"
      />
    </div>
  );
};

export default Habits;
