import { useState, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, ArrowLeftRight, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useHousehold } from "@/hooks/useHousehold";
import { useSelectedMonth } from "@/hooks/useSelectedMonth";
import { MonthSwitcher } from "@/components/finance/MonthSwitcher";
import {
  useFinanceTransactions,
  useFinanceRealtime,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useBulkUpdateTransactionCategory,
  CATEGORY_LABELS,
  FINANCE_CATEGORIES,
  FinanceTransaction,
} from "@/hooks/finance";
import { useUserCards } from "@/hooks/useUserCards";
import { useCustomCategories } from "@/hooks/useCustomCategories";
import { resolveCategoryLabel } from "@/components/finance/CategorySelect";
import { formatINR } from "@/lib/formatINR";
import { PrivateValue, PrivateText } from "@/components/shared/PrivateValue";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useHouseholdMembers } from "@/hooks/useHouseholdMembers";
import { useMemberContributions } from "@/hooks/useMemberContributions";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionAnalyticsPanel } from "@/components/finance/TransactionAnalyticsPanel";

const FinanceTransactions = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { user } = useAuth();
  const { data: members } = useHouseholdMembers(householdId);
  const { categories: customCats } = useCustomCategories("transaction");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [paidByFilter, setPaidByFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"list" | "insights" | "members">("list");
  const [allTime, setAllTime] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<FinanceTransaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<FinanceTransaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const { month, label: monthLabel } = useSelectedMonth();

  const { data: transactions, isLoading } = useFinanceTransactions(householdId, {
    month: allTime ? undefined : month,
    category: catFilter,
    type: typeFilter,
    paidBy: paidByFilter,
    search: search || undefined,
  });
  // Unfiltered current-month + prev-month transactions for the analytics panel.
  const { data: monthAllTx } = useFinanceTransactions(householdId, {
    month: allTime ? undefined : month,
  });
  const prevMonth = (() => {
    if (!month) return undefined;
    const [y, m] = month.split("-").map(Number);
    const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    return pm;
  })();
  const { data: prevMonthTx } = useFinanceTransactions(householdId, { month: prevMonth });
  const { data: memberTotals } = useMemberContributions(householdId, month);
  const showMembersTab = (members?.length ?? 0) >= 2;
  const hasInsights = !allTime && (monthAllTx?.length ?? 0) > 0;

  const memberById = new Map((members || []).map((m) => [m.userId, m]));
  const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "M";

  const { data: userCards } = useUserCards(householdId);
  const userCardIds = userCards?.map((c) => c.card_catalog_id) || [];
  const createTx = useCreateTransaction(householdId);
  const updateTx = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();
  const bulkUpdate = useBulkUpdateTransactionCategory(householdId);

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allVisibleSelected = !!transactions?.length && transactions.every((t) => selectedIds.has(t.id));
  const toggleAllVisible = () => {
    if (!transactions) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) transactions.forEach((t) => next.delete(t.id));
      else transactions.forEach((t) => next.add(t.id));
      return next;
    });
  };

  const clearSelection = () => { setSelectedIds(new Set()); setBulkCategory(""); };

  const handleBulkMove = async () => {
    if (!bulkCategory || selectedIds.size === 0) return;
    await bulkUpdate.mutateAsync({ ids: Array.from(selectedIds), category: bulkCategory });
    clearSelection();
  };

  const handleEditTx = useCallback((tx: FinanceTransaction) => {
    setEditTx(tx);
  }, []);

  const handleDeleteTx = useCallback((tx: FinanceTransaction) => {
    setDeleteTx(tx);
  }, []);

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Transactions</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {(showMembersTab || hasInsights) && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className={cn("grid w-full sm:w-auto", showMembersTab && hasInsights ? "grid-cols-3" : "grid-cols-2") }>
              <TabsTrigger value="list">Transactions</TabsTrigger>
              {hasInsights && <TabsTrigger value="insights">Insights</TabsTrigger>}
              {showMembersTab && <TabsTrigger value="members">By Member</TabsTrigger>}
            </TabsList>
          </Tabs>
        )}

        {activeTab === "insights" && hasInsights ? (
          <TransactionAnalyticsPanel
            currentMonthTx={monthAllTx || []}
            prevMonthTx={prevMonthTx || []}
            members={members || []}
            monthLabel={monthLabel}
            month={month}
            activeCategory={catFilter !== "all" ? catFilter : undefined}
            activeMember={paidByFilter !== "all" ? paidByFilter : undefined}
            onSelectCategory={(c) => {
              setCatFilter((cur) => (cur === c ? "all" : c));
              setActiveTab("list");
            }}
            onSelectMember={(m) => {
              setPaidByFilter((cur) => (cur === m ? "all" : m));
              setActiveTab("list");
            }}
          />
        ) : activeTab === "members" && showMembersTab ? (
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground">Totals for {monthLabel}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(members || []).map((m) => {
                const t = memberTotals?.[m.userId] ?? { income: 0, spent: 0, saved: 0 };
                return (
                  <Card
                    key={m.userId}
                    className="cursor-pointer hover:shadow-md transition"
                    onClick={() => {
                      setPaidByFilter(m.userId);
                      setActiveTab("list");
                    }}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {m.avatarUrl && <AvatarImage src={m.avatarUrl} alt="" />}
                          <AvatarFallback className="text-[10px]">{initialsOf(m.displayName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold truncate">{m.displayName}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Income</p>
                          <p className="text-sm font-semibold tabular-nums text-[hsl(var(--success))]">
                            {t.income > 0 ? <PrivateValue value={t.income} /> : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Spent</p>
                          <p className="text-sm font-semibold tabular-nums">
                            {t.spent > 0 ? <PrivateValue value={t.spent} /> : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Saved</p>
                          <p className="text-sm font-semibold tabular-nums text-primary">
                            {t.saved > 0 ? <PrivateValue value={t.saved} /> : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
        <>
        <div className="flex items-center gap-2">
          <div className={allTime ? "flex-1 opacity-50 pointer-events-none" : "flex-1"}>
            <MonthSwitcher />
          </div>
          <Button
            variant={allTime ? "default" : "outline"}
            size="sm"
            onClick={() => setAllTime((v) => !v)}
            className="shrink-0"
          >
            {allTime ? "Showing all" : "All time"}
          </Button>
        </div>
        {!allTime && (
          <p className="text-[11px] text-muted-foreground -mt-2">Showing transactions for {monthLabel}</p>
        )}

        {/* Active filter chips */}
        {(catFilter !== "all" || paidByFilter !== "all") && (
          <div className="flex flex-wrap gap-2">
            {catFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                <span className="text-[11px]">Filtered: {resolveCategoryLabel(catFilter, CATEGORY_LABELS, customCats)}</span>
                <button
                  type="button"
                  aria-label="Clear category filter"
                  className="ml-1 rounded-full hover:bg-background/60 p-0.5"
                  onClick={() => setCatFilter("all")}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {paidByFilter !== "all" && (
              <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                <span className="text-[11px]">
                  Filtered: {(members || []).find((m) => m.userId === paidByFilter)?.displayName || "Member"}
                </span>
                <button
                  type="button"
                  aria-label="Clear member filter"
                  className="ml-1 rounded-full hover:bg-background/60 p-0.5"
                  onClick={() => setPaidByFilter("all")}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {FINANCE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
                {customCats.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-28"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Credit</SelectItem>
                <SelectItem value="expense">Debit</SelectItem>
                <SelectItem value="savings">Savings</SelectItem>
              </SelectContent>
            </Select>
            {showMembersTab && (
              <Select value={paidByFilter} onValueChange={setPaidByFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Paid by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {(members || []).map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <PageLoading cards={5} heading={false} />
        ) : !transactions?.length ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={search || catFilter !== "all" || typeFilter !== "all" ? "No matches found" : "No expenses logged yet"}
            description={search || catFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Add your first transaction and FamilyDesk will start building your household's spending picture — by category, by member, by month."}
            encouragement={!(search || catFilter !== "all" || typeFilter !== "all") ? "Even small purchases count!" : undefined}
            action={{ label: "Add Transaction", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <>
          {selectedIds.size > 0 && (
            <Card className="bg-accent/30 border-primary/30">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearSelection}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                  <span className="font-medium">{selectedIds.size} selected</span>
                </div>
                <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
                  <Select value={bulkCategory} onValueChange={setBulkCategory}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Move to category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                      ))}
                      {customCats.map((c) => (
                        <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleBulkMove} disabled={!bulkCategory || bulkUpdate.isPending}>
                    Move
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30 text-[11px] text-muted-foreground">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} aria-label="Select all" />
                <span>Select all on this view</span>
              </div>
              {transactions.map((tx) => (
                <div key={tx.id} className={cn(
                  "flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors group",
                  selectedIds.has(tx.id) && "bg-accent/40"
                )}>
                  <Checkbox
                    checked={selectedIds.has(tx.id)}
                    onCheckedChange={() => toggleSelected(tx.id)}
                    aria-label="Select transaction"
                  />
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0",
                    tx.type === "income"
                      ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                      : tx.type === "savings"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {tx.type === "income" ? "+" : tx.type === "savings" ? "→" : "−"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description
                        ? <PrivateText value={tx.description} />
                        : resolveCategoryLabel(tx.category, CATEGORY_LABELS, customCats)}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{format(new Date(tx.transaction_date), "MMM d")}</span>
                      <span>·</span>
                      <span>{resolveCategoryLabel(tx.category, CATEGORY_LABELS, customCats)}</span>
                      {tx.is_recurring && <Badge variant="outline" className="text-[9px] px-1 py-0">Recurring</Badge>}
                      {tx.paid_by && tx.paid_by !== user?.id && memberById.get(tx.paid_by) && (
                        <span className="inline-flex items-center gap-1">
                          <span>·</span>
                          <Avatar className="h-6 w-6">
                            {memberById.get(tx.paid_by)?.avatarUrl && (
                              <AvatarImage src={memberById.get(tx.paid_by)!.avatarUrl!} alt="" />
                            )}
                            <AvatarFallback className="text-[10px]">
                              {initialsOf(memberById.get(tx.paid_by)!.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{memberById.get(tx.paid_by)!.displayName}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold tabular-nums shrink-0",
                    tx.type === "income" && "text-[hsl(var(--success))]",
                    tx.type === "savings" && "text-primary"
                  )}>
                    {tx.type === "income" ? "+" : tx.type === "savings" ? "→" : "−"}<PrivateValue value={Number(tx.amount)} />
                  </span>
                  <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditTx(tx)} style={{ minHeight: "28px" }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteTx(tx)} style={{ minHeight: "28px" }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          </>
        )}

        {!!transactions?.length && (
          <Button
            variant="outline"
            className="w-full border-dashed h-12 text-muted-foreground"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add another transaction
          </Button>
        )}
        </>
        )}
      </main>

      <QuickActionButton
        items={[{ label: "Add Transaction", icon: Plus, onClick: () => setShowAdd(true) }]}
        className="sm:hidden"
      />

      <TransactionDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => createTx.mutate(data)}
        userCardIds={userCardIds}
        isSaving={createTx.isPending}
      />

      {editTx && (
        <TransactionDialog
          open={!!editTx}
          onOpenChange={(open) => !open && setEditTx(null)}
          initialData={editTx}
          userCardIds={userCardIds}
          isSaving={updateTx.isPending}
          onSave={(data) => {
            updateTx.mutate({ id: editTx.id, ...data });
            setEditTx(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleteTx}
        onOpenChange={(open) => !open && setDeleteTx(null)}
        title="Delete transaction?"
        description={`This will permanently remove this ${deleteTx?.type === "income" ? "income" : "expense"} of ${deleteTx ? formatINR(Number(deleteTx.amount)) : ""}.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTx) deleteMut.mutate(deleteTx.id);
          setDeleteTx(null);
        }}
      />
    </div>
  );
};

export default FinanceTransactions;
