import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Check, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from "@/hooks/useFinance";
import {
  CategoryScope,
  CustomCategory,
  useAddCustomCategory,
  useCustomCategories,
  useDeleteCustomCategory,
  useUpdateCustomCategory,
} from "@/hooks/useCustomCategories";

const SCOPE_LABEL: Record<CategoryScope, string> = {
  all: "Both",
  transaction: "Transactions",
  subscription: "Subscriptions",
};

const INCOME_KEYS = new Set(["salary", "freelance", "investment"]);

export default function FinanceBudgetCategories() {
  const { categories, isLoading } = useCustomCategories("all");
  const addCategory = useAddCustomCategory();
  const updateCategory = useUpdateCustomCategory();
  const deleteCategory = useDeleteCustomCategory();

  const [newLabel, setNewLabel] = useState("");
  const [newScope, setNewScope] = useState<CategoryScope>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editScope, setEditScope] = useState<CategoryScope>("all");
  const [deleteTarget, setDeleteTarget] = useState<CustomCategory | null>(null);

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    try {
      await addCategory.mutateAsync({
        label,
        scope: newScope,
        reservedKeys: FINANCE_CATEGORIES,
        reservedLabels: CATEGORY_LABELS,
      });
      setNewLabel("");
      setNewScope("all");
    } catch {
      /* toast handled */
    }
  };

  const startEdit = (c: CustomCategory) => {
    setEditingId(c.id);
    setEditLabel(c.label);
    setEditScope(c.scope);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await updateCategory.mutateAsync({
        id: editingId,
        label: editLabel,
        scope: editScope,
        reservedLabels: CATEGORY_LABELS,
      });
      setEditingId(null);
    } catch {
      /* toast handled */
    }
  };

  const incomeBuiltIn = FINANCE_CATEGORIES.filter((k) => INCOME_KEYS.has(k));
  const expenseBuiltIn = FINANCE_CATEGORIES.filter((k) => !INCOME_KEYS.has(k));

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/finance/budget">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="page-heading">Categories</h1>
            <p className="text-xs text-muted-foreground">
              Add custom categories your household can use across budgets and transactions.
            </p>
          </div>
        </div>

        {/* Add new */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              New category
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="e.g. Pet care"
                value={newLabel}
                maxLength={40}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
              />
              <Select value={newScope} onValueChange={(v) => setNewScope(v as CategoryScope)}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Both</SelectItem>
                  <SelectItem value="transaction">Transactions only</SelectItem>
                  <SelectItem value="subscription">Subscriptions only</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={!newLabel.trim() || addCategory.isPending}
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom categories */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            Your categories
          </h2>
          {isLoading ? (
            <Card><CardContent className="p-4 h-20" /></Card>
          ) : categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No custom categories yet"
              description="Add your first category above to fine-tune budgets and tagging."
            />
          ) : (
            <div className="space-y-2">
              {categories.map((c) => {
                const isEditing = editingId === c.id;
                return (
                  <Card key={c.id}>
                    <CardContent className="p-3 sm:p-4">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <Input
                            value={editLabel}
                            maxLength={40}
                            onChange={(e) => setEditLabel(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                saveEdit();
                              }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            autoFocus
                          />
                          <Select
                            value={editScope}
                            onValueChange={(v) => setEditScope(v as CategoryScope)}
                          >
                            <SelectTrigger className="sm:w-44">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Both</SelectItem>
                              <SelectItem value="transaction">Transactions only</SelectItem>
                              <SelectItem value="subscription">Subscriptions only</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              disabled={updateCategory.isPending}
                              aria-label="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              onClick={saveEdit}
                              disabled={updateCategory.isPending || !editLabel.trim()}
                              aria-label="Save"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{c.label}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {SCOPE_LABEL[c.scope]} · {c.key}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(c)}
                              aria-label="Rename"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(c)}
                              aria-label="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Built-in reference */}
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground px-1">
            Built-in categories
          </h2>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Income
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {incomeBuiltIn.map((k) => (
                    <Badge key={k} variant="secondary">{CATEGORY_LABELS[k]}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
                  Expense
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {expenseBuiltIn.map((k) => (
                    <Badge key={k} variant="secondary">{CATEGORY_LABELS[k]}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Built-in categories can't be renamed or removed.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing transactions and budgets keep their data, but they'll show the
              raw category code instead of this friendly name. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                await deleteCategory.mutateAsync(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}