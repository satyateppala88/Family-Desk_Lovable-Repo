import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles } from "lucide-react";
import { CATEGORY_LABELS } from "@/hooks/finance";
import type { FinanceTransaction } from "@/hooks/finance";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { cn } from "@/lib/utils";

interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  currentMonthTx: FinanceTransaction[];
  prevMonthTx: FinanceTransaction[];
  members: Member[];
  monthLabel: string;
  month: string; // yyyy-MM
  activeCategory?: string;
  activeMember?: string;
  onSelectCategory: (cat: string) => void;
  onSelectMember: (memberId: string) => void;
}

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "M";

export const TransactionAnalyticsPanel = ({
  currentMonthTx,
  prevMonthTx,
  members,
  monthLabel,
  month,
  activeCategory,
  activeMember,
  onSelectCategory,
  onSelectMember,
}: Props) => {
  const { categories: customCats } = useCustomCategories("transaction");
  const [tab, setTab] = useState<"category" | "member" | "week">("category");
  const [showAllCats, setShowAllCats] = useState(true);

  const expenses = useMemo(
    () => currentMonthTx.filter((t) => t.type === "expense"),
    [currentMonthTx]
  );
  const totalSpent = useMemo(
    () => expenses.reduce((s, t) => s + Number(t.amount || 0), 0),
    [expenses]
  );

  // ── By Category ──
  const categoryRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of expenses) {
      map.set(t.category, (map.get(t.category) || 0) + Number(t.amount || 0));
    }
    return Array.from(map.entries())
      .map(([cat, amt]) => ({ cat, amt }))
      .sort((a, b) => b.amt - a.amt);
  }, [expenses]);

  const topCats = categoryRows.slice(0, 5);
  const restCats = categoryRows.slice(5);
  const restTotal = restCats.reduce((s, r) => s + r.amt, 0);

  // ── By Member ──
  const memberRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of expenses) {
      const id = t.paid_by || t.created_by;
      if (!id) continue;
      map.set(id, (map.get(id) || 0) + Number(t.amount || 0));
    }
    const rows = members
      .map((m) => ({ ...m, amt: map.get(m.userId) || 0 }))
      .filter((r) => r.amt > 0)
      .sort((a, b) => b.amt - a.amt);
    return rows;
  }, [expenses, members]);
  const memberTotal = memberRows.reduce((s, r) => s + r.amt, 0);

  // ── By Week ──
  const weekBuckets = useMemo(() => {
    const buckets = [0, 0, 0, 0];
    for (const t of expenses) {
      const day = Number(t.transaction_date.slice(8, 10));
      const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
      buckets[idx] += Number(t.amount || 0);
    }
    return buckets;
  }, [expenses]);
  const weekMax = Math.max(...weekBuckets, 1);
  const activeWeeks = weekBuckets.filter((v) => v > 0).length || 1;
  const weekAvg = weekBuckets.reduce((s, v) => s + v, 0) / activeWeeks;
  const peakWeekIdx = weekBuckets.indexOf(Math.max(...weekBuckets));

  // ── Smart callout ──
  const insight = useMemo(() => {
    if (!expenses.length) return null;
    // 1) Category MoM change
    const prevByCat = new Map<string, number>();
    for (const t of prevMonthTx.filter((x) => x.type === "expense")) {
      prevByCat.set(t.category, (prevByCat.get(t.category) || 0) + Number(t.amount || 0));
    }
    let bestCat: { label: string; pct: number; up: boolean } | null = null;
    for (const { cat, amt } of categoryRows.slice(0, 5)) {
      const prev = prevByCat.get(cat) || 0;
      if (prev <= 0 || amt <= 0) continue;
      const pct = Math.round(((amt - prev) / prev) * 100);
      if (Math.abs(pct) < 20) continue;
      if (!bestCat || Math.abs(pct) > Math.abs(bestCat.pct)) {
        bestCat = {
          label: resolveCategoryLabel(cat, CATEGORY_LABELS, customCats),
          pct: Math.abs(pct),
          up: pct > 0,
        };
      }
    }
    if (bestCat) {
      return `${bestCat.label} ${bestCat.up ? "up" : "down"} ${bestCat.pct}% vs last month`;
    }
    // 2) Member concentration
    if (memberRows.length >= 2 && memberTotal > 0) {
      const top = memberRows[0];
      const share = Math.round((top.amt / memberTotal) * 100);
      if (share >= 55) {
        return `${top.displayName.split(" ")[0]} accounts for ${share}% of spending this month`;
      }
    }
    // 3) Peak week
    if (weekBuckets[peakWeekIdx] > weekAvg * 1.4 && weekBuckets[peakWeekIdx] > 0) {
      return `You've spent more in W${peakWeekIdx + 1} than any other week this month`;
    }
    // 4) Fallback
    const top = categoryRows[0];
    if (top && totalSpent > 0) {
      const share = Math.round((top.amt / totalSpent) * 100);
      return `${resolveCategoryLabel(top.cat, CATEGORY_LABELS, customCats)} is ${share}% of this month's spending`;
    }
    return null;
  }, [expenses, categoryRows, prevMonthTx, memberRows, memberTotal, weekBuckets, weekAvg, peakWeekIdx, totalSpent, customCats]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b border-border/40">
        <Sparkles className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground leading-tight">{monthLabel} spend</p>
          <p className="text-sm font-semibold tabular-nums leading-tight">
            <PrivateValue value={totalSpent} />
          </p>
        </div>
      </div>
      <CardContent className="pt-4 pb-4 space-y-4">
            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="grid grid-cols-3 w-full h-9">
                <TabsTrigger value="category" className="text-xs">By Category</TabsTrigger>
                <TabsTrigger value="member" disabled={members.length < 2} className="text-xs">By Member</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">By Week</TabsTrigger>
              </TabsList>

              {/* CATEGORY */}
              <TabsContent value="category" className="mt-3 space-y-2">
                {topCats.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No expenses yet this month.</p>
                ) : (
                  <>
                    {topCats.map(({ cat, amt }) => {
                      const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => onSelectCategory(cat)}
                          className={cn(
                            "w-full text-left group",
                            isActive && "ring-1 ring-primary rounded-md"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-medium truncate">{resolveCategoryLabel(cat, CATEGORY_LABELS, customCats)}</span>
                            <span className="tabular-nums text-muted-foreground shrink-0 ml-2">
                              <PrivateValue value={amt} /> · {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary group-hover:bg-primary/80 transition-colors"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                    {restCats.length > 0 && !showAllCats && (
                      <button
                        type="button"
                        onClick={() => setShowAllCats(true)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-muted-foreground">Other ({restCats.length})</span>
                          <span className="tabular-nums text-muted-foreground">
                            <PrivateValue value={restTotal} /> · {Math.round((restTotal / totalSpent) * 100)}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-muted-foreground/40"
                            style={{ width: `${Math.max((restTotal / totalSpent) * 100, 2)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-primary mt-1">Show all</p>
                      </button>
                    )}
                    {showAllCats && restCats.map(({ cat, amt }) => {
                      const pct = totalSpent > 0 ? (amt / totalSpent) * 100 : 0;
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => onSelectCategory(cat)}
                          className={cn(
                            "w-full text-left group",
                            isActive && "ring-1 ring-primary rounded-md"
                          )}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="truncate">{resolveCategoryLabel(cat, CATEGORY_LABELS, customCats)}</span>
                            <span className="tabular-nums text-muted-foreground shrink-0 ml-2">
                              <PrivateValue value={amt} /> · {Math.round(pct)}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary/60" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </TabsContent>

              {/* MEMBER */}
              <TabsContent value="member" className="mt-3">
                {memberRows.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No member spending recorded.</p>
                ) : (
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 space-y-2">
                      {memberRows.map((m) => {
                        const pct = memberTotal > 0 ? (m.amt / memberTotal) * 100 : 0;
                        const isActive = activeMember === m.userId;
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => onSelectMember(m.userId)}
                            className={cn(
                              "w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/30 transition",
                              isActive && "ring-1 ring-primary"
                            )}
                          >
                            <Avatar className="h-7 w-7">
                              {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                              <AvatarFallback className="text-[10px]">{initialsOf(m.displayName)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-medium truncate flex-1 text-left">{m.displayName}</span>
                            <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                              <PrivateValue value={m.amt} /> · {Math.round(pct)}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <MemberDonut rows={memberRows.map((r) => ({ id: r.userId, value: r.amt }))} />
                  </div>
                )}
              </TabsContent>

              {/* WEEK */}
              <TabsContent value="week" className="mt-3">
                {totalSpent === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No expenses yet this month.</p>
                ) : (
                  <div>
                    <div className="relative h-28 flex items-end gap-3 px-1">
                      {/* avg line */}
                      {weekAvg > 0 && (
                        <div
                          className="absolute left-0 right-0 border-t border-dashed border-muted-foreground/40"
                          style={{ bottom: `${(weekAvg / weekMax) * 100}%` }}
                          title={`Avg: ${formatINR(weekAvg)}`}
                        />
                      )}
                      {weekBuckets.map((v, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {v > 0 ? <PrivateValue value={v} /> : "—"}
                          </span>
                          <div
                            className={cn(
                              "w-full rounded-t-md transition-all",
                              i === peakWeekIdx && v > 0
                                ? "bg-primary"
                                : "bg-primary/30"
                            )}
                            style={{ height: `${(v / weekMax) * 80}%`, minHeight: v > 0 ? 4 : 0 }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 px-1 mt-1">
                      {["W1", "W2", "W3", "W4"].map((w) => (
                        <div key={w} className="flex-1 text-center text-[10px] text-muted-foreground">{w}</div>
                      ))}
                    </div>
                    {weekAvg > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                        Avg weekly: {formatINR(Math.round(weekAvg))}
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {insight && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-primary/5 border border-primary/15">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/90 leading-snug">{insight}</p>
              </div>
            )}
      </CardContent>
    </Card>
  );
};

// ── Tiny SVG donut ──
const DONUT_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.25)",
  "hsl(var(--muted-foreground) / 0.4)",
];

function MemberDonut({ rows }: { rows: { id: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (total === 0) return null;
  const r = 28;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
      {rows.map((row, i) => {
        const frac = row.value / total;
        const dash = frac * c;
        const el = (
          <circle
            key={row.id}
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth="10"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 36 36)"
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}