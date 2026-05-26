import { useMemo } from "react";
import { format, isToday, parseISO, startOfWeek, endOfWeek } from "date-fns";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useHabits } from "@/hooks/useHabits";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useFinanceMonthlySummary, useFinanceBudgets } from "@/hooks/useFinance";
import { useTodayEvents, useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useTodayTaskCount } from "@/hooks/useTodayTaskCount";
import { formatINR } from "@/lib/formatINR";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";

export interface SnapshotItem {
  key: "tasks" | "meals" | "finance" | "habits" | "grocery" | "calendar";
  label: string;
  subtitle: string;
  urgent: boolean;
  path: string;
  emoji: string;
}

export const useDashboardSnapshot = (householdId: string | null) => {
  const { data: dashStats } = useDashboardStats(householdId);
  const { tasks } = useTaskmaster(householdId);
  const { todaysHabits } = useHabits(householdId);
  const { shoppingLists } = useShoppingLists(householdId);
  const { data: monthly } = useFinanceMonthlySummary(householdId);
  const { data: budgets } = useFinanceBudgets(householdId);
  const { data: todayEvents } = useTodayEvents();
  const { data: weekEvents } = useCalendarEvents(new Date(), "week");
  const { data: todayTaskCount } = useTodayTaskCount(householdId);
  const { isPrivate } = usePrivacyMode();

  return useMemo(() => {
    const money = (n: number) => (isPrivate ? "₹ ••••" : formatINR(n));
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const startOfTodayMs = new Date(todayStr + "T00:00:00").getTime();

    // Tasks: due today + overdue
    const openTasks = (tasks || []).filter((t: any) => t.task_status !== "done");
    const dueToday = openTasks.filter(
      (t: any) => t.due_date && t.due_date.slice(0, 10) === todayStr
    ).length;
    const overdue = openTasks.filter((t: any) => {
      if (!t.due_date) return false;
      return new Date(t.due_date).getTime() < startOfTodayMs;
    }).length;
    const liveCount = todayTaskCount ?? 0;
    const tasksLabel =
      liveCount > 0
        ? `${liveCount} task${liveCount > 1 ? "s" : ""} due today`
        : "All clear ✓";

    // Dinner tonight
    const dinnerItem =
      dashStats?.todayMeals?.find((m: any) => (m.meal_type || "").toLowerCase() === "dinner") ||
      dashStats?.todayMeals?.[0];
    const dinnerName = dinnerItem?.recipes?.title;
    const dinnerLabel = dinnerName ? `${dinnerName} planned` : "Not planned yet";

    // Finance: this month
    const spent = Math.round(monthly?.expenses || 0);
    const totalBudget = (budgets || []).reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
    const left = Math.max(0, totalBudget - spent);
    const overspent = totalBudget > 0 && spent > totalBudget;
    const financeLabel =
      totalBudget > 0
        ? overspent
          ? `${money(spent)} spent — over budget`
          : `${money(spent)} spent — ${money(left)} left`
        : `${money(spent)} spent this month`;

    // Habits today
    const habitsTotal = (todaysHabits || []).length;
    const habitsDone = (todaysHabits || []).filter((h: any) => h.todayLog?.completed).length;
    const isEvening = new Date().getHours() >= 18;
    const habitsLabel = habitsTotal > 0 ? `${habitsDone}/${habitsTotal} done today` : "No habits yet";

    // Shopping
    const activeList =
      (shoppingLists || []).find((l: any) => l.status === "active") || (shoppingLists || [])[0];
    const openItemCount =
      activeList?.items?.filter((i: any) => !i.is_checked).length ?? 0;
    const shoppingLabel =
      openItemCount > 0 ? `${openItemCount} items in list` : "List is empty";

    // Calendar (this week)
    const eventsThisWeek = (weekEvents || []).length;
    const calendarLabel =
      eventsThisWeek > 0
        ? `${eventsThisWeek} event${eventsThisWeek === 1 ? "" : "s"} this week`
        : "No events this week";

    const items: Record<SnapshotItem["key"], SnapshotItem> = {
      tasks: {
        key: "tasks",
        emoji: "📋",
        label: "Tasks",
        subtitle: tasksLabel,
        urgent: overdue > 0,
        path: "/taskmaster/today",
      },
      meals: {
        key: "meals",
        emoji: "🍽",
        label: "Dinner tonight",
        subtitle: dinnerLabel,
        urgent: false,
        path: "/meals",
      },
      finance: {
        key: "finance",
        emoji: "💸",
        label: "This month",
        subtitle: financeLabel,
        urgent: overspent,
        path: "/finance",
      },
      habits: {
        key: "habits",
        emoji: "🌿",
        label: "Habits",
        subtitle: habitsLabel,
        urgent: habitsTotal > 0 && habitsDone === 0 && isEvening,
      path: "/habits",
      },
      grocery: {
        key: "grocery",
        emoji: "🛒",
        label: "Shopping",
        subtitle: shoppingLabel,
        urgent: false,
        path: "/grocery?tab=shopping",
      },
      calendar: {
        key: "calendar",
        emoji: "📅",
        label: "Calendar",
        subtitle: calendarLabel,
        urgent: false,
        path: "/calendar",
      },
    };

    // Module subtitles (used by module grid)
    const moduleSubtitles = {
      tasks: tasksLabel,
      meals: dinnerName ? `${dinnerName} for dinner` : "Dinner not planned",
      grocery: `${dashStats?.pantryItemsCount ?? 0} pantry items`,
      calendar: calendarLabel,
      habits: habitsTotal > 0 ? `${habitsDone}/${habitsTotal} done` : "—",
      finance: `${money(spent)} spent this month`,
    } as Record<string, string>;

    return { items, moduleSubtitles, todayEvents: todayEvents || [], dashStats };
  }, [tasks, dashStats, monthly, budgets, todaysHabits, shoppingLists, weekEvents, todayEvents, todayTaskCount, isPrivate]);
};