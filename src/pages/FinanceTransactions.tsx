import { useState } from "react";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { FinanceNav } from "@/components/finance/FinanceNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil } from "lucide-react";
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
import { formatINR } from "@/lib/formatINR";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { format } from "date-fns";

const FinanceTransactions = () => {
  const { householdId } = useHousehold();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editTx, setEditTx] = useState<FinanceTransaction | null>(null);

  const { data: transactions, isLoading } = useFinanceTransactions(householdId, {
    category: catFilter,
    type: typeFilter,
    search: search || undefined,
  });
  const createTx = useCreateTransaction(householdId);
  const updateTx = useUpdateTransaction();
  const deleteTx = useDeleteTransaction();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 pb-20 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        <FinanceNav />

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-40"
          />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {FINANCE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transaction List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading...</p>
            ) : !transactions?.length ? (
              <p className="p-4 text-sm text-muted-foreground">No transactions found</p>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{tx.description || CATEGORY_LABELS[tx.category]}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(tx.transaction_date), "MMM d, yyyy")}</span>
                        <span>·</span>
                        <span>{CATEGORY_LABELS[tx.category] || tx.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${tx.type === "income" ? "text-[hsl(var(--success))]" : ""}`}>
                        {tx.type === "income" ? "+" : "-"}{formatINR(Number(tx.amount))}
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTx(tx)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteTx.mutate(tx.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <TransactionDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(data) => createTx.mutate(data)}
      />

      {editTx && (
        <TransactionDialog
          open={!!editTx}
          onOpenChange={(open) => !open && setEditTx(null)}
          initialData={editTx}
          onSave={(data) => {
            updateTx.mutate({ id: editTx.id, ...data });
            setEditTx(null);
          }}
        />
      )}

      <Footer />
      <MobileNav />
    </div>
  );
};

export default FinanceTransactions;
