import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parse, addMonths } from "date-fns";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceMonthlySummary,
  CATEGORY_LABELS,
  CATEGORY_ALIASES,
} from "@/hooks/finance";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { cn } from "@/lib/utils";

interface Props {
  month: string; // yyyy-MM
}

const labelFor = (key: string) => {
  const resolved = CATEGORY_ALIASES[key] || key;
  return (
    CATEGORY_LABELS[resolved] ||
    resolved.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

const shiftMonth = (month: string, offset: number) => {
  const d = parse(month + "-01", "yyyy-MM-dd", new Date());
  return format(addMonths(d, offset), "yyyy-MM");
};

const monthShort = (month: string) =>
  format(parse(month + "-01", "yyyy-MM-dd", new Date()), "MMM");

const monthLong = (month: string) =>
  format(parse(month + "-01", "yyyy-MM-dd", new Date()), "MMMM yyyy");

export function MonthlyReportInsights({ month }: Props) {
  const { householdId } = useHousehold();
  const prevMonth = useMemo(() => shiftMonth(month, -1), [month]);
  const prev2Month = useMemo(() => shiftMonth(month, -2), [month]);

  const cur = useFinanceMonthlySummary(householdId, month);
  const prev = useFinanceMonthlySummary(householdId, prevMonth);
  const prev2 = useFinanceMonthlySummary(householdId, prev2Month);

  // Top 5 categories by current-month spend (with last-month comparison)
  const categoryRows = useMemo(() => {
    const curBreak = cur.data?.categoryBreakdown || {};
    const prevBreak = prev.data?.categoryBreakdown || {};
    const keys = new Set([...Object.keys(curBreak), ...Object.keys(prevBreak)]);
    return Array.from(keys)
      .map((k) => ({
        key: k,
        label: labelFor(k),
        current: Number(curBreak[k] || 0),
        previous: Number(prevBreak[k] || 0),
      }))
      .filter((r) => r.current > 0 || r.previous > 0)
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);
  }, [cur.data, prev.data]);

  // Savings rate for 3 months (saved / income, capped to [0, 100]); skip months with no income
  const savingsTrend = useMemo(() => {
    const series = [
      { m: prev2Month, sum: prev2.data },
      { m: prevMonth, sum: prev.data },
      { m: month, sum: cur.data },
    ].map(({ m, sum }) => {
      const income = sum?.income || 0;
      const saved = sum?.saved || 0;
      const rate = income > 0 ? Math.max(0, Math.min(100, (saved / income) * 100)) : null;
      return { month: m, label: monthShort(m), rate };
    });
    return series;
  }, [month, prevMonth, prev2Month, cur.data, prev.data, prev2.data]);

  const trendDirection = useMemo(() => {
    const pts = savingsTrend.filter((p) => p.rate !== null) as { rate: number }[];
    if (pts.length < 2) return "flat" as const;
    const last = pts[pts.length - 1].rate;
    const first = pts[0].rate;
    if (last - first >= 2) return "up" as const;
    if (first - last >= 2) return "down" as const;
    return "flat" as const;
  }, [savingsTrend]);

  // AI insight — only when we have enough data to compare
  const insightQuery = useQuery({
    queryKey: [
      "monthly-report-insight",
      householdId,
      month,
      cur.data?.expenses,
      prev.data?.expenses,
      categoryRows.map((r) => `${r.key}:${r.current}:${r.previous}`).join("|"),
    ],
    enabled:
      !!householdId &&
      !!cur.data &&
      !!prev.data &&
      (cur.data.expenses > 0 || prev.data.expenses > 0),
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async (): Promise<string> => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "monthly-report-insight",
          {
            body: {
              householdId,
              month,
              monthLabel: monthLong(month),
              prevMonthLabel: monthLong(prevMonth),
              currentSpent: cur.data!.expenses,
              previousSpent: prev.data!.expenses,
              currentSaved: cur.data!.saved,
              previousSaved: prev.data!.saved,
              topCategoryDeltas: categoryRows.map((r) => ({
                label: r.label,
                current: r.current,
                previous: r.previous,
              })),
            },
          },
        );
        if (error) throw error;
        const text = (data as { insight?: string })?.insight?.trim();
        return text || "";
      } catch {
        return "";
      }
    },
  });

  const loading = cur.isLoading || prev.isLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month vs Last Month */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Month vs last month</h3>
            <span className="text-[11px] text-muted-foreground">
              {monthShort(month)} vs {monthShort(prevMonth)}
            </span>
          </div>
          {categoryRows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Not enough data to compare yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="text-left font-normal px-2 py-1">Category</th>
                    <th className="text-right font-normal px-2 py-1">This</th>
                    <th className="text-right font-normal px-2 py-1">Last</th>
                    <th className="text-right font-normal px-2 py-1">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map((r) => {
                    const delta = r.current - r.previous;
                    const noPrev = r.previous === 0;
                    let changeEl;
                    if (noPrev && r.current > 0) {
                      changeEl = (
                        <span className="text-warning">new</span>
                      );
                    } else if (delta === 0) {
                      changeEl = <span className="text-muted-foreground">— same</span>;
                    } else {
                      const up = delta > 0;
                      changeEl = (
                        <span className={cn(up ? "text-warning" : "text-success", "tabular-nums")}>
                          {up ? "+" : "−"}
                          <PrivateValue value={Math.abs(delta)} /> {up ? "↑" : "↓"}
                        </span>
                      );
                    }
                    return (
                      <tr key={r.key} className="border-t border-border/60">
                        <td className="px-2 py-1.5 truncate max-w-[140px]">{r.label}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">
                          <PrivateValue value={r.current} />
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                          <PrivateValue value={r.previous} />
                        </td>
                        <td className="px-2 py-1.5 text-right">{changeEl}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings rate trend */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Savings rate trend</h3>
            <span className="text-[11px] text-muted-foreground">Last 3 months</span>
          </div>
          <SavingsSparkline points={savingsTrend} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {savingsTrend.map((p) => (
              <span key={p.month}>
                <span className="text-foreground font-medium">{p.label}:</span>{" "}
                {p.rate === null ? "—" : `${Math.round(p.rate)}%`}
              </span>
            ))}
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              trendDirection === "up" && "text-success",
              trendDirection === "down" && "text-destructive",
              trendDirection === "flat" && "text-muted-foreground",
            )}
          >
            {trendDirection === "up" && <TrendingUp className="w-3.5 h-3.5" />}
            {trendDirection === "down" && <TrendingDown className="w-3.5 h-3.5" />}
            {trendDirection === "flat" && <Minus className="w-3.5 h-3.5" />}
            {trendDirection === "up" && "Your savings rate is improving ↑"}
            {trendDirection === "down" && "Your savings rate is slipping ↓"}
            {trendDirection === "flat" && "Your savings rate is holding steady"}
          </div>
        </CardContent>
      </Card>

      {/* AI Top insight */}
      {insightQuery.data && (
        <Card style={{ backgroundColor: "#F1EFE8" }} className="border-0">
          <CardContent className="p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#0F6E56" }}>
              <Sparkles className="w-3 h-3" />
              FamilyDesk AI
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#2C2C2A" }}>
              {insightQuery.data}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SavingsSparkline({
  points,
}: {
  points: { label: string; rate: number | null }[];
}) {
  const W = 280;
  const H = 56;
  const pad = 6;
  const valid = points.map((p) => (p.rate ?? 0));
  const maxRate = Math.max(10, ...valid);
  const stepX = (W - pad * 2) / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const r = p.rate ?? 0;
    const y = H - pad - (r / maxRate) * (H - pad * 2);
    return { x, y, rate: p.rate };
  });

  const linePath = coords
    .filter((c) => c.rate !== null)
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-14"
      role="img"
      aria-label="Savings rate over last 3 months"
    >
      <line
        x1={pad}
        x2={W - pad}
        y1={H - pad}
        y2={H - pad}
        stroke="hsl(var(--border))"
        strokeWidth={1}
      />
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {coords.map((c, i) =>
        c.rate === null ? null : (
          <circle key={i} cx={c.x} cy={c.y} r={3} fill="hsl(var(--primary))" />
        ),
      )}
    </svg>
  );
}