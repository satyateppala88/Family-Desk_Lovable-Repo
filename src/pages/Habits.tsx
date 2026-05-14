import { useState } from "react";
import { format, differenceInCalendarDays } from "date-fns";
import { Users, User, Leaf, PartyPopper, Trophy, Snowflake, Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ModuleNudgeBanner } from "@/components/discovery/ModuleNudgeBanner";
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
import { useChallenges } from "@/hooks/useChallenges";
import { useStreakFreeze } from "@/hooks/useStreakFreeze";
import { useMissedHabitsYesterday } from "@/hooks/useMissedHabitsYesterday";
import { ChallengePickerSheet } from "@/components/habits/ChallengePickerSheet";
import { ChallengeCard } from "@/components/habits/ChallengeCard";
import { StreakRecoveryBanner } from "@/components/habits/StreakRecoveryBanner";
import { HabitStackSuggestion } from "@/components/habits/HabitStackSuggestion";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const Habits = () => {
  const [view, setView] = useState<"personal" | "household" | "challenges">("personal");
  const { householdId, householdCreatedAt, isLoading: householdLoading } = useHousehold();
  useRealtimeSubscription([
    { table: "habits", filter: householdId ? `household_id=eq.${householdId}` : undefined, enabled: !!householdId, queryKeys: [["habits", householdId], ["habit-assignees", householdId]] },
    { table: "habit_logs", enabled: !!householdId, queryKeys: [["habit-logs-today"], ["household-habit-stats"], ["habit-leaderboard"], ["habit-scores"]] },
    { table: "habit_streaks", enabled: !!householdId, queryKeys: [["habit-streaks"]] },
    { table: "household_challenges", filter: householdId ? `household_id=eq.${householdId}` : undefined, enabled: !!householdId, queryKeys: [["challenges", householdId]] },
    { table: "challenge_logs", enabled: !!householdId, queryKeys: [["challenges", householdId]] },
    { table: "challenge_participants", enabled: !!householdId, queryKeys: [["challenges", householdId]] },
  ], householdId);

  const { habits: allUserHabits, todaysHabits, isLoading: habitsLoading, createHabit, logHabit } = useHabits(householdId);
  const { data: householdStats, isLoading: statsLoading } = useHouseholdHabitStats(householdId);
  const { data: leaderboardEntries, isLoading: leaderboardLoading } = useHabitLeaderboard(householdId);
  const { data: householdMembers } = useHouseholdMembers(householdId);

  const { challenges, isLoading: challengesLoading, startChallenge, joinChallenge, markDone, abandonChallenge, inviteMembers } = useChallenges(householdId);
  const { remaining: freezesRemaining, applyFreeze } = useStreakFreeze();
  const missed = useMissedHabitsYesterday(allUserHabits);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const today = new Date();
  const dismissKey = currentUserId ? `streak-banner-dismissed-${currentUserId}-${format(today, "yyyy-MM-dd")}` : null;
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => {
    if (!dismissKey) return;
    setBannerDismissed(localStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  const [stackSuggestionFor, setStackSuggestionFor] = useState<string | null>(null);
  const [prefillName, setPrefillName] = useState<string | undefined>(undefined);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const userActiveChallenges = challenges.filter((c) =>
    currentUserId ? c.participants.some((p) => p.user_id === currentUserId) : false
  );
  const joinableChallenges = challenges.filter((c) =>
    currentUserId ? !c.participants.some((p) => p.user_id === currentUserId) : true
  );

  const completedCount = todaysHabits.filter((h) => h.todayLog?.completed).length;
  const totalCount = todaysHabits.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const householdAgeDays = householdCreatedAt
    ? differenceInCalendarDays(new Date(), new Date(householdCreatedAt))
    : 0;
  const householdTooNew = householdAgeDays < 3;
  const neutralCoachCopy = "Add your first habit to start tracking your household's daily routine.";
  const householdCompletedToday = householdStats?.completedToday ?? 0;
  const householdTotalHabits = householdStats?.totalHabits ?? 0;

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
    createHabit.mutate(data, {
      onSuccess: () => {
        setStackSuggestionFor(data.name);
        setPrefillName(undefined);
      },
    });
  };

  const handlePickStack = (suggestion: string) => {
    setStackSuggestionFor(null);
    setPrefillName(suggestion);
    setCreateDialogOpen(true);
  };

  const handleUseFreeze = () => {
    if (missed.length === 0) return;
    applyFreeze.mutate(missed.map((m) => m.id));
  };

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (dismissKey) localStorage.setItem(dismissKey, "1");
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
        <ModuleNudgeBanner
          moduleKey="habits"
          text="Build habits together. Family streaks are harder to break than solo ones."
        />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="page-heading">Habits</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-muted-foreground text-sm">{format(today, "EEEE, MMMM d")}</p>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                freezesRemaining > 0 ? "border-sky-200 bg-sky-50 text-sky-700" : "border-muted text-muted-foreground"
              )}>
                <Snowflake className="h-3 w-3" aria-hidden="true" />
                {freezesRemaining} freeze{freezesRemaining === 1 ? "" : "s"} left
              </span>
            </div>
          </div>
          <div data-tour="view-toggle">
            <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
              <TabsList>
                <TabsTrigger value="personal" className="gap-1.5">
                  <User className="h-4 w-4" aria-hidden="true" />
                  Me
                </TabsTrigger>
                <TabsTrigger value="household" className="gap-1.5">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Household
                </TabsTrigger>
                <TabsTrigger value="challenges" className="gap-1.5">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                  Challenges
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {view === "personal" ? (
          <div className="space-y-3">
            {/* Pinned active challenges */}
            {userActiveChallenges.length > 0 && (
              <div className="space-y-2">
                <p className="text-label flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" /> Family Challenges
                </p>
                {userActiveChallenges.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    members={householdMembers || []}
                    currentUserId={currentUserId}
                    compact
                    onMarkDone={(id) => markDone.mutate(id)}
                    isMutating={markDone.isPending}
                  />
                ))}
              </div>
            )}

            {/* Streak recovery banner */}
            {!bannerDismissed && (
              <StreakRecoveryBanner
                missed={missed}
                freezesRemaining={freezesRemaining}
                onUseFreeze={handleUseFreeze}
                onDismiss={handleDismissBanner}
                isApplying={applyFreeze.isPending}
              />
            )}

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

            <Button
              className="w-full gap-2"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Habit
            </Button>

            {totalCount === 0 || completedCount === 0 || householdTooNew ? (
              <HabitCoachInsight content={neutralCoachCopy} onDismiss={() => {}} />
            ) : completedCount < totalCount ? (
              <HabitCoachInsight
                content="You're making progress! Keep the momentum going — every check-off counts."
                onDismiss={() => {}}
              />
            ) : null}

            {habitsLoading ? (
              <PageLoading cards={3} heading={false} />
            ) : todaysHabits.length === 0 ? (
              <EmptyState
                icon={Leaf}
                title="No habits yet"
                description="A small daily action, done consistently, changes everything. Add your first habit and track streaks across your whole household."
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
                defaultName={prefillName}
                controlledOpen={createDialogOpen}
                onControlledOpenChange={setCreateDialogOpen}
              />
            </div>

            {stackSuggestionFor && (
              <HabitStackSuggestion
                habitName={stackSuggestionFor}
                onPick={handlePickStack}
                onDismiss={() => setStackSuggestionFor(null)}
              />
            )}
          </div>
        ) : view === "household" ? (
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

                {householdTotalHabits === 0 || householdCompletedToday === 0 || householdTooNew ? (
                  <HabitCoachInsight content={neutralCoachCopy} onDismiss={() => {}} />
                ) : (
                  <HabitCoachInsight
                    content="Your household is building great consistency! Consider adding a shared family habit like an evening walk or gratitude moment."
                    onDismiss={() => {}}
                  />
                )}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-section-title">Active Challenges</h2>
              <ChallengePickerSheet
                onStart={(t, d) => startChallenge.mutate({ template: t, durationDays: d })}
                isLoading={startChallenge.isPending}
              />
            </div>
            {challengesLoading ? (
              <PageLoading cards={2} heading={false} />
            ) : challenges.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No active challenges"
                description="Pick a 7- or 21-day challenge and rally the family."
              />
            ) : (
              <div className="space-y-3">
                {userActiveChallenges.map((c) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    members={householdMembers || []}
                    currentUserId={currentUserId}
                    onMarkDone={(id) => markDone.mutate(id)}
                    onInvite={(id) => inviteMembers.mutate(id)}
                    onAbandon={(id) => abandonChallenge.mutate(id)}
                    isMutating={markDone.isPending || inviteMembers.isPending || abandonChallenge.isPending}
                  />
                ))}
                {joinableChallenges.length > 0 && (
                  <>
                    <p className="text-label pt-2">You can join</p>
                    {joinableChallenges.map((c) => (
                      <ChallengeCard
                        key={c.id}
                        challenge={c}
                        members={householdMembers || []}
                        currentUserId={currentUserId}
                        onMarkDone={(id) => markDone.mutate(id)}
                        onJoin={(id) => joinChallenge.mutate(id)}
                        isMutating={joinChallenge.isPending}
                      />
                    ))}
                  </>
                )}
              </div>
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
