import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { DEFAULT_CATEGORIES } from "@/hooks/usePantryCategories";
import type { PantryItem } from "@/hooks/usePantryItems";
import type { ScannedBill, ScannedBillItem } from "./ScanBillDialog";

const UNIT_OPTIONS = ["pcs", "kg", "g", "L", "ml", "packets", "bottles", "dozen"];

interface ReviewRow extends ScannedBillItem {
  _id: string;
  _mergeWith?: string | null; // pantry item id to merge into
}

interface BillReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: ScannedBill | null;
  pantryItems: PantryItem[];
  onConfirm: (params: {
    inserts: Array<Partial<PantryItem>>;
    merges: Array<{ id: string; quantity: number }>;
    billDate: string | null;
  }) => Promise<void> | void;
  isSaving?: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findFuzzyMatch(name: string, pantry: PantryItem[]): PantryItem | undefined {
  const n = normalize(name);
  if (!n) return undefined;
  // Exact normalized match first
  const exact = pantry.find(p => normalize(p.name) === n);
  if (exact) return exact;
  // Substring either direction
  return pantry.find(p => {
    const pn = normalize(p.name);
    return pn.length > 2 && (pn.includes(n) || n.includes(pn));
  });
}

export const BillReviewDialog = ({
  open,
  onOpenChange,
  bill,
  pantryItems,
  onConfirm,
  isSaving,
}: BillReviewDialogProps) => {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [store, setStore] = useState("");
  const [billDate, setBillDate] = useState("");

  useEffect(() => {
    if (!bill) return;
    setStore(bill.store || "");
    setBillDate(bill.bill_date || new Date().toISOString().slice(0, 10));
    setRows(
      bill.items.map((item) => {
        const match = findFuzzyMatch(item.name, pantryItems);
        return {
          ...item,
          _id: makeId(),
          _mergeWith: match?.id ?? null,
        };
      })
    );
  }, [bill, pantryItems]);

  const lowConfidenceCount = useMemo(
    () => rows.filter(r => (r.confidence ?? 1) < 0.6).length,
    [rows]
  );

  const updateRow = (id: string, patch: Partial<ReviewRow>) => {
    setRows(prev => prev.map(r => (r._id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r._id !== id));
  };

  const addBlankRow = () => {
    setRows(prev => [
      ...prev,
      {
        _id: makeId(),
        name: "",
        quantity: 1,
        unit: "pcs",
        category: "Other",
        expiry_days: 0,
        confidence: 1,
        _mergeWith: null,
      },
    ]);
  };

  const handleSave = async () => {
    const valid = rows.filter(r => r.name.trim().length > 0 && r.quantity > 0);
    const inserts: Array<Partial<PantryItem>> = [];
    const merges: Array<{ id: string; quantity: number }> = [];
    const purchasedAt = billDate ? new Date(billDate).toISOString() : new Date().toISOString();

    for (const r of valid) {
      if (r._mergeWith) {
        const existing = pantryItems.find(p => p.id === r._mergeWith);
        if (existing) {
          merges.push({
            id: existing.id,
            quantity: (existing.quantity || 0) + Number(r.quantity),
          });
          continue;
        }
      }
      const expiryDate =
        r.expiry_days > 0
          ? new Date(Date.now() + r.expiry_days * 86400_000).toISOString().slice(0, 10)
          : null;
      inserts.push({
        name: r.name.trim(),
        quantity: Number(r.quantity),
        unit: r.unit || "pcs",
        category: r.category || "Other",
        expiry_date: expiryDate,
        is_staple: false,
        minimum_quantity: 0,
        last_purchased_at: purchasedAt,
      });
    }

    await onConfirm({ inserts, merges, billDate: billDate || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review extracted items</DialogTitle>
          <DialogDescription>
            Edit anything before saving. Items already in your pantry are auto-detected — toggle merge to add to existing stock instead of creating a duplicate.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
          <div className="space-y-1">
            <Label htmlFor="bill-store" className="text-xs">Store</Label>
            <Input id="bill-store" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bill-date" className="text-xs">Bill date</Label>
            <Input id="bill-date" type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </div>
        </div>

        {lowConfidenceCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {lowConfidenceCount} row{lowConfidenceCount === 1 ? "" : "s"} flagged as low confidence — please verify.
          </div>
        )}

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 pb-2">
            {rows.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                No items. Add one manually below.
              </div>
            )}
            {rows.map((r) => {
              const lowConf = (r.confidence ?? 1) < 0.6;
              const mergeTarget = r._mergeWith ? pantryItems.find(p => p.id === r._mergeWith) : null;
              return (
                <div
                  key={r._id}
                  className={`rounded-lg border p-3 space-y-2 ${lowConf ? "border-amber-300 bg-amber-50/40" : "bg-card"}`}
                >
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-12 sm:col-span-5">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Item</Label>
                      <Input
                        value={r.name}
                        onChange={(e) => updateRow(r._id, { name: e.target.value })}
                        placeholder="Item name"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={r.quantity}
                        onChange={(e) => updateRow(r._id, { quantity: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Unit</Label>
                      <Select value={r.unit} onValueChange={(v) => updateRow(r._id, { unit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Expiry days</Label>
                      <Input
                        type="number" inputMode="numeric"
                        min={0}
                        value={r.expiry_days}
                        onChange={(e) => updateRow(r._id, { expiry_days: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-11 sm:col-span-1 flex sm:justify-end items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(r._id)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="col-span-12 sm:col-span-6">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Category</Label>
                      <Select value={r.category} onValueChange={(v) => updateRow(r._id, { category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEFAULT_CATEGORIES.map(c => (
                            <SelectItem key={c.name} value={c.name}>{c.icon} {c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-12 sm:col-span-6 flex flex-wrap items-end gap-2">
                      {lowConf && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                          Low confidence
                        </Badge>
                      )}
                      {r.unit_price != null && (
                        <Badge variant="secondary">₹{r.unit_price.toFixed(2)}</Badge>
                      )}
                    </div>
                  </div>

                  {mergeTarget && (
                    <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2">
                      <div className="text-xs text-muted-foreground">
                        Looks like <span className="font-medium text-foreground">{mergeTarget.name}</span> ({mergeTarget.quantity ?? 0} {mergeTarget.unit ?? ""}) in your pantry.
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Merge</span>
                        <Switch
                          checked={!!r._mergeWith}
                          onCheckedChange={(v) => updateRow(r._id, { _mergeWith: v ? mergeTarget.id : null })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <Button type="button" variant="outline" className="w-full gap-2" onClick={addBlankRow}>
              <Plus className="h-4 w-4" /> Add row
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-between">
          <div className="text-xs text-muted-foreground self-center">
            {rows.length} item{rows.length === 1 ? "" : "s"} ready to save
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || rows.length === 0}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save to pantry
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};