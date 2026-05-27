import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { useSavingsContributions } from "@/hooks/useSavingsContributions";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { SAVINGS_CATEGORY_LABELS } from "@/hooks/finance";
import { formatINR } from "@/lib/formatINR";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

type RangeKey = "all" | "month" | "3m" | "12m";

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "month", label: "This month" },
  { key: "3m", label: "Last 3 months" },
  { key: "12m", label: "Last 12 months" },
];

const PALETTE = [
  "hsl(var(--primary))",
  "hsl(var(--module-finance))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--accent))",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--module-finance) / 0.6)",
  "hsl(var(--success) / 0.6)",
  "hsl(var(--muted-foreground) / 0.55)",
];

const initialsOf = (name: string) =>
  (name || "M").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "M";
const firstName = (n: string) => (n || "Member").split(/\s+/)[0];

interface Props {
  householdId: string | null;
}

export const SavingsCategoryDashboard = ({ householdId }: Props) => {
  const { data: contributions } = useSavingsContributions(householdId);
  const { data: members } = useHouseholdMembers(householdId);
  const { isPrivate } = usePrivacyMode();
  const [range, setRange] = useState<RangeKey>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all"); // "all" | userId

  const cutoff = useMemo(() => {
    const now = new Date();
    if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === "3m") return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (range === "12m") return new Date(now.getFullYear(), now.getMonth() - 11, 1);
    return null;
  }, [range]);

  const filtered = useMemo(() => {
    return (contributions || []).filter((c) => {
      if (cutoff && new Date(c.transaction_date) < cutoff) return false;
      if (memberFilter !== "all" && c.paid_by !== memberFilter) return false;
      return true;
    });
  }, [contributions, cutoff, memberFilter]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      map.set(c.category, (map.get(c.category) || 0) + Number(c.amount || 0));
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  const total = byCategory.reduce((s, r) => s + r.amount, 0);

  const byMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      if (!c.paid_by) continue;
      map.set(c.paid_by, (map.get(c.paid_by) || 0) + Number(c.amount || 0));
    }
    return Array.from(map.entries())
      .map(([uid, amount]) => ({
        uid,
        amount,
        member: (members || []).find((m) => m.userId === uid),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, members]);

  const showMemberSplit = memberFilter === "all" && byMember.length >= 2;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Savings by category</h2>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setRange(o.key)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                  range === o.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          {(members?.length || 0) > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setMemberFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[11px] border transition-colors",
                  memberFilter === "all"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:text-foreground",
                )}
              >
                Everyone
              </button>
              {(members || []).map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setMemberFilter(m.userId)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[11px] border transition-colors inline-flex items-center gap-1",
                    memberFilter === m.userId
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-muted-foreground border-border hover:text-foreground",
                  )}
                >
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-foreground text-[8px] font-semibold">
                    {initialsOf(m.displayName)}
                  </span>
                  {firstName(m.displayName)}
                </button>
              ))}
            </div>
          )}
        </div>

        {byCategory.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-4 text-center">
            No savings recorded for this filter.
          </p>
        ) : (
          <>
            {/* Donut */}
            <div className="relative h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="hsl(var(--background))"
                  >
                    {byCategory.map((row, i) => (
                      <Cell key={row.category} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, name: string) => [
                      isPrivate ? "₹ ••••" : formatINR(v),
                      SAVINGS_CATEGORY_LABELS[name] || name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="text-base font-semibold tabular-nums">
                  <PrivateValue value={total} />
                </p>
              </div>
            </div>

            {/* Category list */}
            <div className="space-y-1.5">
              {byCategory.map((row, i) => {
                const pct = total > 0 ? (row.amount / total) * 100 : 0;
                return (
                  <div key={row.category} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="text-[12px] flex-1 min-w-0 truncate">
                      {SAVINGS_CATEGORY_LABELS[row.category] || row.category}
                    </span>
                    <span className="text-[12px] font-medium tabular-nums">
                      <PrivateValue value={row.amount} />
                    </span>
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, background: PALETTE[i % PALETTE.length] }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                      {Math.round(pct)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Member split */}
            {showMemberSplit && (
              <div className="border-t pt-2 space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">By member</p>
                {byMember.map((mr) => {
                  const name = mr.member ? mr.member.displayName : "Member";
                  const pct = total > 0 ? (mr.amount / total) * 100 : 0;
                  return (
                    <div key={mr.uid} className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[10px] font-semibold shrink-0">
                        {initialsOf(name)}
                      </span>
                      <span className="text-[11px] flex-1 min-w-0 truncate">{firstName(name)}</span>
                      <span className="text-[11px] font-medium tabular-nums">
                        <PrivateValue value={mr.amount} />
                      </span>
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SavingsCategoryDashboard;