import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, CreditCard, TrendingUp, Award } from "lucide-react";
import { FINANCE_CATEGORIES, CATEGORY_LABELS } from "@/hooks/useFinance";
import { recommendBestCard, CREDIT_CARD_CATALOG } from "@/data/creditCardCatalog";
import { formatINR } from "@/lib/formatINR";
import { cn } from "@/lib/utils";

interface CardRecommenderProps {
  userCardIds: string[];
}

export const CardRecommender = ({ userCardIds }: CardRecommenderProps) => {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [results, setResults] = useState<ReturnType<typeof recommendBestCard>>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleCheck = () => {
    if (!category || !amount || Number(amount) <= 0) return;
    const recs = recommendBestCard(userCardIds, category, Number(amount));
    setResults(recs);
    setHasSearched(true);
  };

  if (userCardIds.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Add your cards first</p>
          <p className="text-xs text-muted-foreground mt-1">
            Once you add your credit cards, we'll recommend the best one for every transaction.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Which card should I use?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {FINANCE_CATEGORIES.filter(c => !["salary", "freelance", "investment", "savings"].includes(c)).map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Amount (₹)</Label>
            <Input
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-sm"
              min="0"
            />
          </div>
        </div>

        <Button onClick={handleCheck} className="w-full" size="sm" disabled={!category || !amount}>
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Find best card
        </Button>

        {hasSearched && (
          <div className="space-y-2 pt-1">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">
                No matching benefits found for this category.
              </p>
            ) : (
              results.map((r, i) => (
                <div
                  key={r.card.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border",
                    i === 0 ? "bg-primary/5 border-primary/20" : ""
                  )}
                >
                  <div
                    className="w-10 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: r.card.color }}
                  >
                    {r.card.network.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold truncate">{r.card.bank} {r.card.name}</p>
                      {i === 0 && (
                        <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-0">
                          Best
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.benefit.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-primary">
                      {r.benefit.type === "cashback" ? `${r.benefit.value}%` : `${r.benefit.value}×`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      ≈ {formatINR(Math.round(r.estimatedValue))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
