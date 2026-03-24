import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CreditCard, Plus, Check, Loader2 } from "lucide-react";
import { CREDIT_CARD_CATALOG, getUniqueBanks, type CreditCard as CreditCardType } from "@/data/creditCardCatalog";
import { cn } from "@/lib/utils";

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (cardId: string) => void;
  existingCardIds: string[];
  isAdding?: boolean;
}

export const AddCardDialog = ({ open, onOpenChange, onAdd, existingCardIds, isAdding }: AddCardDialogProps) => {
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const banks = useMemo(() => getUniqueBanks(), []);

  const filtered = useMemo(() => {
    return CREDIT_CARD_CATALOG.filter((c) => {
      if (bankFilter && c.bank !== bankFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.bank.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, bankFilter]);

  const handleAdd = (card: CreditCardType) => {
    if (existingCardIds.includes(card.id)) return;
    setJustAdded(card.id);
    onAdd(card.id);
    // Brief visual feedback, then allow adding more
    setTimeout(() => setJustAdded(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Add Credit Cards
          </DialogTitle>
          <DialogDescription>
            Pick cards from the catalog. You can add multiple cards at once.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by card name or bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={bankFilter === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setBankFilter(null)}
          >
            All
          </Badge>
          {banks.map((b) => (
            <Badge
              key={b}
              variant={bankFilter === b ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setBankFilter(bankFilter === b ? null : b)}
            >
              {b}
            </Badge>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cards match your search</p>
          ) : (
            filtered.map((card) => {
              const isAdded = existingCardIds.includes(card.id);
              const isBeingAdded = justAdded === card.id || (isAdding && justAdded === card.id);
              return (
                <div
                  key={card.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border transition-all",
                    isAdded ? "bg-muted/50 border-primary/20" : "hover:bg-accent/30",
                    isBeingAdded && "ring-1 ring-primary/30 bg-primary/5"
                  )}
                >
                  <div
                    className="w-10 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: card.color }}
                  >
                    {card.network.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{card.bank} {card.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {card.benefits.slice(0, 2).map((b) => b.description).join(" · ")}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{card.network}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {card.annualFee === 0 ? "Lifetime Free" : `₹${card.annualFee}/yr`}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? "outline" : "default"}
                    className="shrink-0 h-8"
                    disabled={isAdded || isBeingAdded}
                    onClick={() => handleAdd(card)}
                  >
                    {isAdded ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : isBeingAdded ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
