import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoading } from "@/components/ui/page-loading";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, CreditCard, Trash2, Sparkles, Award, Gift } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useFinanceRealtime } from "@/hooks/useFinance";
import { useUserCards, useAddUserCard, useRemoveUserCard } from "@/hooks/useUserCards";
import { useCustomCards, useRemoveCustomCard } from "@/hooks/useCustomCards";
import { CREDIT_CARD_CATALOG } from "@/data/creditCardCatalog";
import { AddCardDialog } from "@/components/finance/AddCardDialog";
import { CardRecommender } from "@/components/finance/CardRecommender";
import { formatINR } from "@/lib/formatINR";
import { cn } from "@/lib/utils";

const FinanceCards = () => {
  const { householdId } = useHousehold();
  useFinanceRealtime(householdId);
  const { data: userCards, isLoading } = useUserCards(householdId);
  const { data: customCards, isLoading: loadingCustom } = useCustomCards(householdId);
  const addCard = useAddUserCard(householdId);
  const removeCard = useRemoveUserCard(householdId);
  const removeCustomCard = useRemoveCustomCard(householdId);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [deleteCard, setDeleteCard] = useState<{ id: string; name: string; isCustom?: boolean } | null>(null);

  const userCardIds = userCards?.map((c) => c.card_catalog_id) || [];
  const enrichedCards = userCards?.map((uc) => ({
    ...uc,
    catalog: CREDIT_CARD_CATALOG.find((c) => c.id === uc.card_catalog_id),
  })).filter((c) => c.catalog) || [];

  const customEnriched = (customCards || []).map((cc) => ({
    id: cc.id,
    isCustom: true as const,
    catalog: {
      id: cc.id,
      name: cc.name,
      bank: cc.bank,
      network: cc.network as any,
      annualFee: Number(cc.annual_fee) || 0,
      color: cc.color,
      benefits: cc.benefits || [],
      milestones: cc.milestones || [],
      perks: cc.perks || [],
    },
  }));

  const allCards: Array<{ id: string; isCustom?: boolean; catalog: any }> = [
    ...enrichedCards.map((c) => ({ id: c.id, isCustom: false, catalog: c.catalog! })),
    ...customEnriched,
  ];

  return (
    <div className="page-container">
      <Header />
      <main className="page-content space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="page-heading">Cards</h1>
          <Button size="sm" onClick={() => setShowAdd(true)} className="hidden sm:flex">
            <Plus className="w-4 h-4 mr-1" /> Add Card
          </Button>
        </div>

        {/* Recommender */}
        <CardRecommender userCardIds={userCardIds} />

        {/* My Cards */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">My Wallet</h2>
          <span className="text-xs text-muted-foreground">{enrichedCards.length} card{enrichedCards.length !== 1 ? "s" : ""}</span>
        </div>

        {isLoading || loadingCustom ? (
          <PageLoading cards={3} heading={false} />
        ) : allCards.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Your wallet is empty"
            description="Add the credit cards you use so we can recommend the best one for every purchase."
            encouragement="Start with the card you use most often"
            action={{ label: "Add Your First Card", onClick: () => setShowAdd(true) }}
          />
        ) : (
          <div className="space-y-2">
            {allCards.map(({ id, isCustom, catalog }) => {
              if (!catalog) return null;
              const isExpanded = expandedCard === id;
              return (
                <Card
                  key={id}
                  className={cn(
                    "transition-all cursor-pointer overflow-hidden",
                    isExpanded && "ring-1 ring-primary/20"
                  )}
                  onClick={() => setExpandedCard(isExpanded ? null : id)}
                >
                  <CardContent className="p-0">
                    {/* Card header with gradient */}
                    <div
                      className="px-4 py-3 flex items-center gap-3"
                      style={{
                        background: `linear-gradient(135deg, ${catalog.color}15, ${catalog.color}05)`,
                      }}
                    >
                      <div
                        className="w-12 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${catalog.color}, ${catalog.color}cc)`,
                        }}
                      >
                        {catalog.network.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                          {catalog.bank} {catalog.name}
                          {isCustom && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">Custom</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {catalog.annualFee === 0 ? "Lifetime Free" : `₹${catalog.annualFee}/yr`}
                          {" · "}
                          {catalog.network}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteCard({ id, name: `${catalog.bank} ${catalog.name}`, isCustom });
                        }}
                        style={{ minHeight: "28px" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-3 border-t border-border/50 space-y-3">
                        {/* Benefits */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Benefits
                          </p>
                          <div className="space-y-1">
                            {catalog.benefits.map((b: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{b.description}</span>
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 ml-2">
                                  {b.type === "cashback" ? `${b.value}%` : `${b.value}×`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Milestones */}
                        {catalog.milestones.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                              <Award className="w-3 h-3" /> Milestones
                            </p>
                            <div className="space-y-1">
                              {catalog.milestones.map((m: any, i: number) => (
                                <div key={i} className="text-xs text-muted-foreground">
                                  Spend {formatINR(m.threshold)}/month → {m.reward}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Perks */}
                        {catalog.perks.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                              <Gift className="w-3 h-3" /> Perks
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {catalog.perks.map((p: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Add more cards nudge */}
            <Button
              variant="outline"
              className="w-full border-dashed h-12 text-muted-foreground"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add another card
            </Button>
          </div>
        )}
      </main>

      <QuickActionButton
        items={[{ label: "Add Card", icon: Plus, onClick: () => setShowAdd(true) }]}
        className="sm:hidden"
      />

      <AddCardDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onAdd={(cardId) => addCard.mutate({ card_catalog_id: cardId })}
        existingCardIds={userCardIds}
        isAdding={addCard.isPending}
        householdId={householdId}
      />

      <ConfirmDialog
        open={!!deleteCard}
        onOpenChange={(open) => !open && setDeleteCard(null)}
        title="Remove card?"
        description={`This will remove "${deleteCard?.name}" from your wallet. You can always add it back later.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteCard) {
            if (deleteCard.isCustom) removeCustomCard.mutate(deleteCard.id);
            else removeCard.mutate(deleteCard.id);
          }
          setDeleteCard(null);
        }}
      />
    </div>
  );
};

export default FinanceCards;
