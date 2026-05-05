import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CreditCard, Plus, Check, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { CREDIT_CARD_CATALOG, getUniqueBanks, type CreditCard as CreditCardType } from "@/data/creditCardCatalog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAddCustomCard } from "@/hooks/useCustomCards";

interface AddCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (cardId: string) => void;
  existingCardIds: string[];
  isAdding?: boolean;
  householdId?: string;
}

export const AddCardDialog = ({ open, onOpenChange, onAdd, existingCardIds, isAdding, householdId }: AddCardDialogProps) => {
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [view, setView] = useState<"catalog" | "lookup">("catalog");
  const [lookupBank, setLookupBank] = useState("");
  const [lookupName, setLookupName] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);

  const addCustom = useAddCustomCard(householdId);

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

  const handleLookup = async () => {
    if (!lookupBank.trim() || !lookupName.trim()) {
      toast.error("Please enter both bank and card name");
      return;
    }
    setLooking(true);
    setLookupResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-credit-card", {
        body: { bank: lookupBank.trim(), card_name: lookupName.trim() },
      });
      if (error) throw error;
      if (!data?.success || !data.card) throw new Error("No data returned");
      if (!data.card.found) {
        toast.error("Couldn't find reliable info for this card. Try a different name.");
      }
      setLookupResult(data.card);
    } catch (e: any) {
      toast.error(e.message || "Lookup failed");
    } finally {
      setLooking(false);
    }
  };

  const handleAddCustom = () => {
    if (!lookupResult || !householdId) return;
    addCustom.mutate(
      {
        name: lookupResult.name,
        bank: lookupResult.bank,
        network: lookupResult.network,
        annual_fee: lookupResult.annual_fee || 0,
        color: lookupResult.color || "#1a3a5c",
        benefits: lookupResult.benefits || [],
        milestones: lookupResult.milestones || [],
        perks: lookupResult.perks || [],
        source: `ai-lookup:${lookupResult.confidence || "medium"}`,
      },
      {
        onSuccess: () => {
          setLookupResult(null);
          setLookupBank("");
          setLookupName("");
          setView("catalog");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === "lookup" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1" onClick={() => { setView("catalog"); setLookupResult(null); }}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <CreditCard className="w-5 h-5" />
            {view === "catalog" ? "Add Credit Cards" : "Find your card"}
          </DialogTitle>
          <DialogDescription>
            {view === "catalog"
              ? "Pick cards from the catalog. You can add multiple cards at once."
              : "Tell us the bank and card name — we'll look up the benefits for you."}
          </DialogDescription>
        </DialogHeader>

        {view === "catalog" && (
        <>
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
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">No cards match your search</p>
              <Button variant="outline" size="sm" onClick={() => { setView("lookup"); setLookupName(search); }}>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Search the bank for this card
              </Button>
            </div>
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

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setView("lookup")}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Can't find your card? Search the bank
        </Button>
        </>
        )}

        {view === "lookup" && (
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
            <div className="space-y-2">
              <Input
                placeholder="Bank (e.g. HDFC, SBI, ICICI)"
                value={lookupBank}
                onChange={(e) => setLookupBank(e.target.value)}
              />
              <Input
                placeholder="Card name (e.g. Diners Club Black)"
                value={lookupName}
                onChange={(e) => setLookupName(e.target.value)}
              />
              <Button onClick={handleLookup} disabled={looking} className="w-full">
                {looking ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching the bank…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Find this card</>
                )}
              </Button>
            </div>

            {lookupResult && (
              <div className="rounded-xl border p-3 space-y-3 bg-accent/20">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-8 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: lookupResult.color || "#1a3a5c" }}
                  >
                    {(lookupResult.network || "VI").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{lookupResult.bank} {lookupResult.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lookupResult.network} · {lookupResult.annual_fee === 0 ? "Lifetime Free" : `₹${lookupResult.annual_fee}/yr`}
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      AI confidence: {lookupResult.confidence || "medium"}
                    </Badge>
                  </div>
                </div>

                {lookupResult.benefits?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Benefits</p>
                    <div className="space-y-1">
                      {lookupResult.benefits.map((b: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate mr-2">{b.description}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                            {b.type === "cashback" ? `${b.value}%` : `${b.value}×`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {lookupResult.perks?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Perks</p>
                    <div className="flex flex-wrap gap-1">
                      {lookupResult.perks.map((p: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleAddCustom}
                  disabled={addCustom.isPending || !householdId}
                >
                  {addCustom.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding…</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Add to my wallet</>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Details are AI-sourced and may not be 100% accurate. You can edit later.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
