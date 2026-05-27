import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Wallet, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FestivalBanner } from "@/components/dashboard/FestivalBanner";
import { DidYouKnowCard } from "@/components/dashboard/DidYouKnowCard";
import { useUpcomingFestival } from "@/hooks/useUpcomingFestival";
import { matchFestivalChecklist } from "@/data/festivalChecklists";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useTaskmaster } from "@/hooks/useTaskmaster";
import { useFinanceBudgets, useFinanceMonthlySummary } from "@/hooks/finance";
import { isToday, isTomorrow, parseISO, format } from "date-fns";

const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const dismissKey = (slug: string) => `familydesk:nudge-dismissed:${slug}`;
const isDismissed = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return true;
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch {
    return false;
  }
};
const setDismissed = (key: string) => {
  try {
    localStorage.setItem(key, String(Date.now()));
  } catch {
    /* noop */
  }
};

/**
 * Zone 2 nudge slot. Shows ONE contextual banner in priority order:
 *   1. Upcoming festival / today-or-tomorrow event   (FestivalBanner)
 *   2. Overdue tasks warning
 *   3. Budget over-limit alert
 *   4. "Did you know?" rotating tip
 *
 * Each nudge has an X dismiss; once dismissed, the next priority shows.
 */
export const DashboardNudge = ({ householdId }: { householdId: string | null }) => {
  const [tick, setTick] = useState(0); // bumps when a nudge is dismissed
  const bump = () => setTick((n) => n + 1);

  // ── Priority 1: festival/event (delegate to FestivalBanner UI/logic) ──
  const { data: festival } = useUpcomingFestival();
  const { data: weekEvents } = useCalendarEvents(new Date(), "week");

  const festivalActive = useMemo(() => {
    if (festival) {
      const checklist = matchFestivalChecklist(festival.name);
      if (checklist && !isDismissed(`festival-banner-dismissed-${festival.id}`)) {
        return true;
      }
    }
    const upcoming = (weekEvents || []).find((e: any) => {
      const d = e.start_date || e.start_time || e.start;
      if (!d) return false;
      try {
        const dt = typeof d === "string" ? parseISO(d) : new Date(d);
        return isToday(dt) || isTomorrow(dt);
      } catch {
        return false;
      }
    });
    if (upcoming) {
      const id = (upcoming as any).id || (upcoming as any).event_id ||
        (upcoming as any).start_date || (upcoming as any).start_time || "";
      try {
        if (localStorage.getItem(`familydesk:event-nudge-dismissed:${id}`) === "true") {
          return false;
        }
      } catch {
        /* ignore */
      }
      return true;
    }
    return false;
    // tick triggers re-eval after a nested dismiss
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festival, weekEvents, tick]);

  // ── Priority 2: overdue tasks ──
  const { tasks } = useTaskmaster(householdId);
  const overdueCount = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const startMs = new Date(todayStr + "T00:00:00").getTime();
    return (tasks || []).filter(
      (t: any) => t.task_status !== "done" && t.due_date &&
        new Date(t.due_date).getTime() < startMs,
    ).length;
  }, [tasks]);
  const overdueDismissKey = dismissKey(`overdue:${format(new Date(), "yyyy-MM-dd")}`);
  const showOverdue = overdueCount > 0 && !isDismissed(overdueDismissKey);

  // ── Priority 3: budget over limit ──
  const { data: budgets } = useFinanceBudgets(householdId, format(new Date(), "yyyy-MM"));
  const { data: summary } = useFinanceMonthlySummary(householdId);
  const overBudgetCount = useMemo(() => {
    const breakdown = summary?.categoryBreakdown || {};
    return (budgets || []).filter((b: any) => {
      const planned = Number(b.planned_amount) || 0;
      const spent = Number(breakdown[b.category] || 0);
      return planned > 0 && spent > planned;
    }).length;
  }, [budgets, summary]);
  const budgetDismissKey = dismissKey(`budget:${format(new Date(), "yyyy-MM")}`);
  const showBudget = overBudgetCount > 0 && !isDismissed(budgetDismissKey);

  // Render in priority order
  if (festivalActive) return <FestivalBanner />;

  if (showOverdue) {
    return (
      <Card className="mb-4 border-destructive/30 bg-destructive/5">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="rounded-full bg-destructive/10 p-2 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm flex-1">
              <span className="font-medium">
                {overdueCount} overdue {overdueCount === 1 ? "task" : "tasks"}
              </span>{" "}
              — clear them so today doesn't pile up.
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild size="sm" className="flex-1 sm:flex-initial">
              <Link to="/taskmaster/today">Review</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Dismiss"
              onClick={() => {
                setDismissed(overdueDismissKey);
                bump();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showBudget) {
    return (
      <Card className="mb-4 border-warning/30" style={{ backgroundColor: "hsl(var(--warning) / 0.06)" }}>
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex items-start gap-3 flex-1">
            <div className="rounded-full p-2 mt-0.5" style={{ backgroundColor: "hsl(var(--warning) / 0.15)" }}>
              <Wallet className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
            </div>
            <p className="text-sm flex-1">
              <span className="font-medium">
                {overBudgetCount} {overBudgetCount === 1 ? "category is" : "categories are"} over budget
              </span>{" "}
              this month — quick check-in?
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild size="sm" className="flex-1 sm:flex-initial">
              <Link to="/finance/budget">Open budget</Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Dismiss"
              onClick={() => {
                setDismissed(budgetDismissKey);
                bump();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Priority 4 — fallback tip
  return <DidYouKnowCard />;
};