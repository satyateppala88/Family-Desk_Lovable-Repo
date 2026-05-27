import { useState } from "react";
import { Header } from "@/components/layout/Header";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, RefreshCw, CalendarClock, Pause, Play } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceRealtime } from "@/hooks/finance";
import {
  useSubscriptions,
  useCreateSubscription,
  useUpdateSubscription,
  useDeleteSubscription,
  SUBSCRIPTION_CATEGORY_LABELS,
  SUBSCRIPTION_CATEGORIES,
  FREQUENCY_LABELS,
  FinanceSubscription,
} from "@/hooks/useSubscriptions";
import { SubscriptionDialog } from "@/components/finance/SubscriptionDialog";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue } from "@/components/shared/PrivateValue";
import { format, isPast, isToday, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRecurrenceSummary } from "@/utils/recurrenceUtils";

const FinanceSubscriptions = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { categories: customCats } = useCustomCategories("subscription");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showAdd, setShowAdd] = useState(false);
  const [editSub, setEditSub] = useState<FinanceSubscription | null>(null);
  const [deleteSub, setDeleteSub] = useState<FinanceSubscription | null>(null);

  const { data: subscriptions, isLoading } = useSubscriptions(householdId);
  const createSub = useCreateSubscription(householdId);
  const updateSub = useUpdateSubscription();
  const deleteMut = useDeleteSubscription();

  const filtered = subscriptions?.filter((s) => {
    if (statusFilter === "active" && !s.is_active) return false;
    if (statusFilter === "paused" && s.is_active) return false;
    if (catFilter !== "all" && s.category !== catFilter) return false;
    return true;
  });

  // Detect duplicate names so we can surface the amount as a secondary identifier.
  const nameCounts = (filtered ?? []).reduce<Record<string, number>>((acc, s) => {
    const key = s.name.trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Stable category → color dot mapping (HSL hues, low risk of clashing with brand).
  const categoryDot = (cat: string): string => {
    let hash = 0;
    for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 55% 55%)`;
  };

  const totalMonthly = filtered
    ?.filter((s) => s.is_active)
    .reduce((sum, s) => {
      const amt = Number(s.amount);
      switch (s.frequency) {
        case "weekly": return sum + amt * 4.33;
        case "monthly": return sum + amt;
        case "quarterly": return sum + amt / 3;
        case "half_yearly": return sum + amt / 6;
        case "yearly": return sum + amt / 12;
        default: return sum + amt;
      }
    }, 0) ?? 0;

  const getDueStatus = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    if (isToday(d)) return "today";
    if (isPast(d)) return "overdue";
    if (d <= addDays(new Date(), 7)) return "upcoming";
    return null;
  };

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Subscriptions</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        

        {/* Summary */}
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Est. Monthly Cost</p>
              <p className="text-xl font-bold text-primary"><PrivateValue value={Math.round(totalMonthly)} /></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-bold">{filtered?.filter((s) => s.is_active).length ?? 0}</p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SUBSCRIPTION_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{SUBSCRIPTION_CATEGORY_LABELS[c]}</SelectItem>
              ))}
              {customCats.map((c) => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <PageLoading cards={4} heading={false} />
        ) : !filtered?.length ? (
          <EmptyState
            icon={RefreshCw}
            title="No subscriptions yet"
            description="Track your recurring expenses like streaming services, insurance premiums, and AMCs in one place."
            action={{ label: "Add Subscription", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((sub) => {
              const dueStatus = getDueStatus(sub.next_due_date);
              return (
                <Card key={sub.id} className={cn("transition-colors", !sub.is_active && "opacity-60")}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      dueStatus === "overdue" ? "bg-destructive/10 text-destructive" :
                      dueStatus === "today" ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" :
                      "bg-primary/10 text-primary"
                    )}>
                      <RefreshCw className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{sub.name}</p>
                        {!sub.is_active && <Badge variant="outline" className="text-[9px] px-1 py-0">Paused</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <span>{resolveCategoryLabel(sub.category, SUBSCRIPTION_CATEGORY_LABELS, customCats)}</span>
                        <span>·</span>
                        <span>
                          {sub.recurrence
                            ? formatRecurrenceSummary(sub.recurrence)
                            : (FREQUENCY_LABELS[sub.frequency] || sub.frequency)}
                        </span>
                        {sub.next_due_date && (
                          <>
                            <span>·</span>
                            <span className={cn(
                              dueStatus === "overdue" && "text-destructive font-medium",
                              dueStatus === "today" && "text-[hsl(var(--warning))] font-medium",
                            )}>
                              {dueStatus === "overdue" ? "Overdue" :
                               dueStatus === "today" ? "Due today" :
                               `Due ${format(new Date(sub.next_due_date), "MMM d")}`}
                            </span>
                          </>
                        )}
                        {sub.end_date && (
                          <>
                            <span>·</span>
                            <span>Ends {format(new Date(sub.end_date), "MMM d, yyyy")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0"><PrivateValue value={Number(sub.amount)} /></span>
                    <div className="flex gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateSub.mutate({ id: sub.id, is_active: !sub.is_active })}
                        title={sub.is_active ? "Pause" : "Resume"}
                        style={{ minHeight: "28px" }}
                      >
                        {sub.is_active ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSub(sub)} style={{ minHeight: "28px" }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteSub(sub)}
                        style={{ minHeight: "28px" }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <QuickActionButton
        items={[{ label: "Add Subscription", icon: Plus, onClick: () => setShowAdd(true) }]}
        className="sm:hidden"
      />

      <SubscriptionDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => createSub.mutate(data)}
      />

      {editSub && (
        <SubscriptionDialog
          open={!!editSub}
          onOpenChange={(open) => !open && setEditSub(null)}
          initialData={editSub}
          onSave={(data) => {
            updateSub.mutate({ id: editSub.id, ...data });
            setEditSub(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteSub}
        onOpenChange={(open) => !open && setDeleteSub(null)}
        title="Remove subscription?"
        description={`This will permanently remove "${deleteSub?.name}" from your subscriptions.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteSub) deleteMut.mutate(deleteSub.id);
          setDeleteSub(null);
        }}
      />
    </div>
  );
};

export default FinanceSubscriptions;
