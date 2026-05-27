import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { Badge } from "@/components/ui/badge";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceRealtime, CATEGORY_LABELS, SAVINGS_CATEGORY_LABELS } from "@/hooks/finance";
import { useFinanceTrends } from "@/hooks/useFinanceTrends";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { formatINR, formatINRCompact } from "@/lib/formatINR";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { BarChart3, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const FinanceTrends = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { categories: customCats } = useCustomCategories("transaction");
  const { data: trends, isLoading } = useFinanceTrends(householdId, 6);
  const { isPrivate } = usePrivacyMode();
  const moneyAxis = (v: number) => (isPrivate ? "₹ ••••" : formatINRCompact(v));
  const moneyTip = (v: number) => (isPrivate ? "₹ ••••" : formatINR(v));

  const hasData = !!trends?.some((t) => t.count > 0);

  // Top 5 categories across the window
  const totalsByCategory: Record<string, number> = {};
  trends?.forEach((m) => {
    Object.entries(m.byCategory).forEach(([k, v]) => {
      totalsByCategory[k] = (totalsByCategory[k] || 0) + (v as number);
    });
  });
  const topCats = Object.entries(totalsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([k]) => k);

  // Build per-month rows for stacked-category chart
  const stackedData = (trends || []).map((m) => {
    const row: Record<string, any> = { label: m.label };
    topCats.forEach((c) => (row[c] = m.byCategory[c] || 0));
    return row;
  });

  // Savings categories across the window
  const savingsTotalsByCategory: Record<string, number> = {};
  trends?.forEach((m) => {
    Object.entries(m.bySavingsCategory).forEach(([k, v]) => {
      savingsTotalsByCategory[k] = (savingsTotalsByCategory[k] || 0) + (v as number);
    });
  });
  const topSavingsCats = Object.entries(savingsTotalsByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([k]) => k);
  const stackedSavingsData = (trends || []).map((m) => {
    const row: Record<string, any> = { label: m.label };
    topSavingsCats.forEach((c) => (row[c] = m.bySavingsCategory[c] || 0));
    return row;
  });

  // Movers: this month vs last month (last two buckets)
  const movers = (() => {
    if (!trends || trends.length < 2) return [] as Array<{ category: string; current: number; prev: number; delta: number; pct: number }>;
    const cur = trends[trends.length - 1];
    const prev = trends[trends.length - 2];
    const cats = new Set<string>([
      ...Object.keys(cur.byCategory),
      ...Object.keys(prev.byCategory),
    ]);
    const rows = Array.from(cats).map((c) => {
      const a = cur.byCategory[c] || 0;
      const p = prev.byCategory[c] || 0;
      const delta = a - p;
      const pct = p > 0 ? Math.round((delta / p) * 100) : a > 0 ? 100 : 0;
      return { category: c, current: a, prev: p, delta, pct };
    });
    return rows
      .filter((r) => Math.abs(r.delta) >= 50)
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 5);
  })();

  const palette = [
    "hsl(var(--module-finance))",
    "hsl(var(--primary))",
    "hsl(var(--module-finance) / 0.65)",
    "hsl(var(--primary) / 0.65)",
    "hsl(var(--muted-foreground) / 0.6)",
  ];

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4 animate-fade-in">
        <div>
          <h1 className="page-heading">Trends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Last 6 months at a glance</p>
        </div>

        {isLoading ? (
          <PageLoading cards={3} heading={false} />
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No trends yet"
            description="Once you've logged transactions across a few months, this view will show your income, spending, and category trends."
            action={{ label: "Add Transactions", onClick: () => (window.location.href = "/finance/transactions") }}
          />
        ) : (
          <>
            {/* Income vs Expenses */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Income, Expenses & Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => moneyAxis(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => moneyTip(v)}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="income" name="Income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--module-finance))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="contributions" name="Savings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Savings rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Savings rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trends} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => `${v}%`}
                      />
                      <Line type="monotone" dataKey="savingsRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top categories stacked */}
            {topCats.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Top categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => moneyAxis(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number) => moneyTip(v)}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => resolveCategoryLabel(v as string, CATEGORY_LABELS, customCats)} />
                        {topCats.map((c, i) => (
                          <Bar key={c} dataKey={c} stackId="a" fill={palette[i % palette.length]} radius={i === topCats.length - 1 ? [4, 4, 0, 0] : 0} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Savings by category */}
            {topSavingsCats.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Savings by category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-56 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stackedSavingsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={(v) => moneyAxis(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={50} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                          formatter={(v: number) => moneyTip(v)}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} formatter={(v) => SAVINGS_CATEGORY_LABELS[v as string] || (v as string)} />
                        {topSavingsCats.map((c, i) => (
                          <Bar key={c} dataKey={c} stackId="s" fill={palette[i % palette.length]} radius={i === topSavingsCats.length - 1 ? [4, 4, 0, 0] : 0} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Biggest movers */}
            {movers.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Biggest movers vs last month</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {movers.map((m) => {
                    const up = m.delta > 0;
                    const Icon = up ? ArrowUp : ArrowDown;
                    return (
                      <div key={m.category} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{resolveCategoryLabel(m.category, CATEGORY_LABELS, customCats)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground tabular-nums"><PrivateValue value={m.current} /></span>
                          <Badge
                            variant={up ? "destructive" : "success"}
                            className="gap-0.5"
                          >
                            <Icon className="w-3 h-3" />
                            {Math.abs(m.pct)}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default FinanceTrends;