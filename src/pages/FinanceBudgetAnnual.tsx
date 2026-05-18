import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import {
  CATEGORY_LABELS,
  useFinanceAnnualBudget,
  useFinanceRealtime,
} from "@/hooks/useFinance";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { usePrivacyMode } from "@/contexts/PrivacyModeContext";
import { cn } from "@/lib/utils";
import { BudgetSubNav } from "@/components/finance/BudgetSubNav";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function heatColor(planned: number, actual: number): string {
  if (planned === 0 && actual === 0) return "bg-muted/40";
  if (planned === 0) return "bg-muted/60";
  const pct = (actual / planned) * 100;
  if (pct > 100) return "bg-destructive/70";
  if (pct > 80) return "bg-warning/70";
  if (pct > 0) return "bg-primary/60";
  return "bg-muted/40";
}

export default function FinanceBudgetAnnual() {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { month: selectedMonth } = useSelectedMonth();
  const initialYear = parseInt(selectedMonth.slice(0, 4), 10);
  const [year, setYear] = useState<number>(initialYear);
  const { data, isLoading } = useFinanceAnnualBudget(householdId, year);
  const { categories: customCats } = useCustomCategories("transaction");

  const overallPct =
    data && data.totalPlanned > 0
      ? Math.min(100, (data.totalActual / data.totalPlanned) * 100)
      : 0;

  const rows = useMemo(() => data?.rows || [], [data]);

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div>
          <h1 className="page-heading">Budget</h1>
          <p className="text-xs text-muted-foreground">Annual rollup across all categories.</p>
        </div>

        <BudgetSubNav />

        {/* Year switcher */}
        <div className="flex items-center justify-between">
          <Button size="icon" variant="outline" onClick={() => setYear((y) => y - 1)} aria-label="Previous year">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-base font-medium">{year}</div>
          <Button size="icon" variant="outline" onClick={() => setYear((y) => y + 1)} aria-label="Next year">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Overall card */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Year total</span>
              <span className={cn("font-medium", overallPct > 90 && "text-destructive")}>
                {formatINR(data?.totalActual || 0)} / {formatINR(data?.totalPlanned || 0)}
              </span>
            </div>
            <Progress value={overallPct} className="h-2" />
            <p className="text-[11px] text-muted-foreground text-right">{Math.round(overallPct)}% used</p>
          </CardContent>
        </Card>

        {/* By-category heatmap table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Card key={i}><CardContent className="p-4 h-24" /></Card>)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No budget activity in this year"
            description="Add monthly budgets to see them roll up here."
          />
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const variance = row.annualPlanned - row.annualActual;
              const variancePct =
                row.annualPlanned > 0 ? (variance / row.annualPlanned) * 100 : 0;
              return (
                <Card key={row.category}>
                  <CardContent className="p-3 sm:p-4 space-y-2">
                    <div className="flex justify-between items-baseline gap-2">
                      <div className="text-sm font-medium truncate">
                        {resolveCategoryLabel(row.category, CATEGORY_LABELS, customCats)}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs">
                          {formatINR(row.annualActual)}
                          <span className="text-muted-foreground"> / {formatINR(row.annualPlanned)}</span>
                        </div>
                        <div
                          className={cn(
                            "text-[11px]",
                            variance < 0 ? "text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {variance < 0 ? "Over " : "Under "}
                          {formatINR(Math.abs(variance))}
                          {row.annualPlanned > 0 && (
                            <> ({Math.round(Math.abs(variancePct))}%)</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      {row.monthlyPlanned.map((p, i) => {
                        const a = row.monthlyActual[i];
                        const monthStr = `${year}-${String(i + 1).padStart(2, "0")}`;
                        const title = `${MONTH_LABELS[i]} · ${formatINR(a)} / ${formatINR(p)}`;
                        return (
                          <Link
                            key={i}
                            to={`/finance/budget?m=${monthStr}`}
                            className={cn(
                              "h-7 rounded-sm flex items-center justify-center text-[9px] font-medium text-foreground/80 hover:ring-1 hover:ring-primary/40 transition",
                              heatColor(p, a),
                            )}
                            title={title}
                            aria-label={title}
                          >
                            {MONTH_LABELS[i][0]}
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}