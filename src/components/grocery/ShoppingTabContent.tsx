import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart } from "lucide-react";
import { ShoppingListCard } from "./ShoppingListCard";
import { ShoppingListDetailView } from "./ShoppingListDetailView";
import { ShareOnWhatsAppButton } from "./ShareOnWhatsAppButton";
import { useShoppingLists } from "@/hooks/useShoppingLists";

interface ShoppingTabContentProps {
  householdId: string | null;
  userId: string;
  onShowCreateList: () => void;
  onDeleteList: (listId: string) => void;
  onGenerateFromMealPlan: () => void;
}

export const ShoppingTabContent = ({
  householdId,
  userId,
  onShowCreateList,
  onDeleteList,
  onGenerateFromMealPlan,
}: ShoppingTabContentProps) => {
  const {
    shoppingLists,
    toggleItemChecked,
    completeShoppingList,
    deleteItem,
  } = useShoppingLists(householdId);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedListId = searchParams.get("list");
  const selectedList = shoppingLists.find((list) => list.id === selectedListId);

  const handleBackToLists = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("list");
    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const handleToggleItem = useCallback(
    (itemId: string, isChecked: boolean) => {
      if (!userId) return;
      toggleItemChecked.mutate({ id: itemId, is_checked: isChecked, user_id: userId });
    },
    [userId, toggleItemChecked],
  );

  const handleCompleteList = useCallback(
    (listId: string) => completeShoppingList.mutate(listId),
    [completeShoppingList],
  );

  if (selectedList) {
    return (
      <ShoppingListDetailView
        list={selectedList}
        onBack={handleBackToLists}
        onToggleItem={handleToggleItem}
        onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
        userId={userId}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Create lists manually or generate them from your meal plan.
        </p>
        <div className="flex gap-2">
          {shoppingLists.length > 0 && (
            <ShareOnWhatsAppButton
              list={shoppingLists.find((l) => l.status === "active") || shoppingLists[0]}
              size="sm"
              label="Share"
            />
          )}
          <Button onClick={onShowCreateList} className="gap-2">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Create List
          </Button>
        </div>
      </div>

      {shoppingLists.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="No shopping lists yet"
          description="Create a list for your next grocery run, or generate one from your meal plan."
          action={{ label: "Create List", onClick: onShowCreateList }}
          secondaryAction={{ label: "From Meal Plan", onClick: onGenerateFromMealPlan }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shoppingLists.map((list) => (
            <ShoppingListCard
              key={list.id}
              list={list}
              onDelete={onDeleteList}
              onComplete={handleCompleteList}
            />
          ))}
        </div>
      )}
    </>
  );
};