import { useState } from "react";
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
import { Plus, Trash2, Pencil, ArrowLeftRight, Search } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import {
  useFinanceTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  CATEGORY_LABELS,
  FINANCE_CATEGORIES,
  FinanceTransaction,
} from "@/hooks/useFinance";
import { useUserCards } from "@/hooks/useUserCards";
import { formatINR } from "@/lib/formatINR";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const FinanceTransactions = () => {
  const { householdId } = useHousehold();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<FinanceTransaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<FinanceTransaction | null>(null);

  const { data: transactions, isLoading } = useFinanceTransactions(householdId, {
    category: catFilter,
    type: typeFilter,
    search: search || undefined,
  });
  const { data: userCards } = useUserCards(householdId);
  const userCardIds = userCards?.map((c) => c.card_catalog_id) || [];
  const createTx = useCreateTransaction(householdId);
  const updateTx = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();

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
          <div className="flex gap-2">
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {FINANCE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-28"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transaction List */}
        {isLoading ? (
          <PageLoading cards={5} heading={false} />
        ) : !transactions?.length ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={search || catFilter !== "all" || typeFilter !== "all" ? "No matches found" : "No transactions yet"}
            description={search || catFilter !== "all" || typeFilter !== "all"
              ? "Try adjusting your filters to see more results."
              : "Start tracking where your money goes — every entry helps build the full picture."}
            encouragement={!(search || catFilter !== "all" || typeFilter !== "all") ? "Even small purchases count!" : undefined}
            action={{ label: "Add Transaction", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <Card>
            <CardContent className="p-0 divide-y divide-border/50">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors group">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0",
                    tx.type === "income" ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-muted text-muted-foreground"
                  )}>
                    {tx.type === "income" ? "+" : "−"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || CATEGORY_LABELS[tx.category] || tx.category}</p>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{format(new Date(tx.transaction_date), "MMM d")}</span>
                      <span>·</span>
                      <span>{CATEGORY_LABELS[tx.category] || tx.category}</span>
                      {tx.is_recurring && <Badge variant="outline" className="text-[9px] px-1 py-0">Recurring</Badge>}
                    </div>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums shrink-0", tx.type === "income" ? "text-[hsl(var(--success))]" : "")}>
                    {tx.type === "income" ? "+" : "−"}{formatINR(Number(tx.amount))}
                  </span>
                  <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTx(tx)} style={{ minHeight: "28px" }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTx(tx)} style={{ minHeight: "28px" }}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
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
      />

      {editTx && (
        <TransactionDialog
          open={!!editTx}
          onOpenChange={(open) => !open && setEditTx(null)}
          initialData={editTx}
          userCardIds={userCardIds}
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
