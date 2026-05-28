import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ModuleNudgeBanner } from "@/components/discovery/ModuleNudgeBanner";
import {
  Plus,
  ListChecks,
  Package,
  Sparkles,
  ShoppingCart,
  ScanLine,
  Settings,
} from "lucide-react";
import { AddPantryItemDialog } from "@/components/grocery/AddPantryItemDialog";
import { QuickAddChecklist } from "@/components/grocery/QuickAddChecklist";
import { CreateShoppingListDialog } from "@/components/grocery/CreateShoppingListDialog";
import { PantrySettingsSheet } from "@/components/grocery/PantrySettingsSheet";
import { PantryTabContent } from "@/components/grocery/PantryTabContent";
import { ShoppingTabContent } from "@/components/grocery/ShoppingTabContent";
import { GroceryInsightsTab } from "@/components/grocery/GroceryInsightsTab";
import {
  BillScanFlow,
  type BillScanFlowHandle,
} from "@/components/grocery/BillScanFlow";
import { usePantryItems, type PantryItem } from "@/hooks/usePantryItems";
import { usePantryCategories } from "@/hooks/usePantryCategories";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useGroceryActions } from "@/hooks/useGroceryActions";
import { useHousehold } from "@/hooks/useHousehold";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { AIActionSheet } from "@/components/ai/AIActionSheet";

const Grocery = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const [searchParams, setSearchParams] = useSearchParams();

  useRealtimeSubscription(
    [
      {
        table: "shopping_lists",
        filter: householdId ? `household_id=eq.${householdId}` : undefined,
        enabled: !!householdId,
        queryKeys: [["shopping-lists", householdId]],
      },
      {
        table: "shopping_list_items",
        enabled: !!householdId,
        queryKeys: [["shopping-lists", householdId]],
      },
      {
        table: "pantry_items",
        filter: householdId ? `household_id=eq.${householdId}` : undefined,
        enabled: !!householdId,
        queryKeys: [
          ["pantry-items", householdId],
          ["pantry-stats", householdId],
        ],
      },
    ],
    householdId,
  );

  const actions = useGroceryActions(householdId, user?.id);
  const { pantryItems, addPantryItem, updatePantryItem, deletePantryItem, bulkAddItems } =
    usePantryItems(householdId);
  const { categories } = usePantryCategories(householdId);
  const { createShoppingList, deleteShoppingList } = useShoppingLists(householdId);

  // Local UI state (dialogs, edit target, active tab)
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showPantrySettings, setShowPantrySettings] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(
    () => searchParams.get("tab") || "pantry",
  );
  const billScanRef = useRef<BillScanFlowHandle>(null);

  // Sync tab + handle ?add=1 quick action
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
    if (searchParams.get("add") === "1") {
      setShowAddDialog(true);
      const next = new URLSearchParams(searchParams);
      next.delete("add");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!user || !householdId) {
    return (
      <div className="page-container">
        <Header />
        <main className="page-content">
          <EmptyState
            icon={Package}
            title="Sign in to get started"
            description="Log in and join a household to manage your pantry and shopping lists."
          />
        </main>
      </div>
    );
  }

  const handleAddItem = (item: Partial<PantryItem>) => {
    if (editItem) {
      updatePantryItem.mutate({ id: editItem.id, updates: item });
      setEditItem(null);
    } else {
      addPantryItem.mutate({ ...item, household_id: householdId, added_by: user.id });
    }
  };

  const handleBulkAdd = (items: Partial<PantryItem>[]) => {
    bulkAddItems.mutate(
      items.map((item) => ({ ...item, household_id: householdId, added_by: user.id })),
    );
  };

  return (
    <div className="page-container">
      <Header />
      <main className="page-content flex-1">
        <ModuleNudgeBanner
          moduleKey="grocery"
          text="Add pantry staples now — FamilyDesk tracks what's running low so you never forget at the store."
        />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="fd-eyebrow mb-0.5">KITCHEN</div>
            <h1 className="fd-display text-[24px] text-fd-ink">Grocery</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pantryItems.length > 0
                ? `${pantryItems.length} items in your pantry`
                : "Start building your pantry inventory"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => billScanRef.current?.openAIImport()}
              className="gap-2 h-9"
              size="sm"
              data-tour="ai-import"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">AI Import</span>
              <span className="xs:hidden">AI</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => billScanRef.current?.openScan()}
              className="gap-2 h-9"
              size="sm"
              data-tour="scan-bill"
            >
              <ScanLine className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">Scan Bill</span>
              <span className="xs:hidden">Scan</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowQuickAdd(true)}
              className="gap-2 h-9"
              size="sm"
              data-tour="quick-add"
            >
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">Quick Add</span>
              <span className="xs:hidden">Quick</span>
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2 h-9" size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xs:inline">Add Item</span>
              <span className="xs:hidden">Add</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowPantrySettings(true)}
              className="h-9 w-9"
              aria-label="Grocery settings"
              title="Grocery settings"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pantry" className="gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              Pantry
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Shopping
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="pantry" className="space-y-6">
            <PantryTabContent
              householdId={householdId}
              cartItemCount={actions.cartItemCount}
              isAddingLowStock={actions.isAddingLowStock}
              onAddLowStockItem={actions.handleAddLowStockItem}
              onAddToCart={actions.handleAddToCart}
              onViewCart={actions.handleViewCart}
              onShowAddDialog={() => setShowAddDialog(true)}
              onShowQuickAdd={() => setShowQuickAdd(true)}
              onOpenAI={() => setAiOpen(true)}
            />
          </TabsContent>

          <TabsContent value="shopping" className="space-y-6">
            <ShoppingTabContent
              householdId={householdId}
              userId={user.id}
              onShowCreateList={() => setShowCreateList(true)}
              onDeleteList={(listId) => setDeleteListId(listId)}
              onGenerateFromMealPlan={actions.handleGenerateFromMealPlan}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <GroceryInsightsTab householdId={householdId} />
          </TabsContent>
        </Tabs>
      </main>

      <AddPantryItemDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditItem(null);
        }}
        onSubmit={handleAddItem}
        categories={categories}
        householdId={householdId}
        userId={user.id}
        editItem={editItem}
      />

      <QuickAddChecklist
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onSubmit={handleBulkAdd}
        householdId={householdId}
        userId={user.id}
      />

      <BillScanFlow
        ref={billScanRef}
        householdId={householdId}
        userId={user.id}
        pantryItems={pantryItems}
        onAIImport={actions.handleAIImport}
        onSaveScannedBill={actions.handleSaveScannedBill}
      />

      <CreateShoppingListDialog
        open={showCreateList}
        onOpenChange={setShowCreateList}
        onSubmit={(name) =>
          createShoppingList.mutate({
            household_id: householdId,
            name,
            created_by: user.id,
          })
        }
        onGenerateFromMealPlan={actions.handleGenerateFromMealPlan}
      />

      <ConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        title="Remove this item?"
        description="It will be removed from your pantry inventory."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteItemId) {
            deletePantryItem.mutate(deleteItemId);
            setDeleteItemId(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteListId}
        onOpenChange={(open) => !open && setDeleteListId(null)}
        title="Delete this shopping list?"
        description="The list and all its items will be permanently removed."
        confirmLabel="Delete List"
        variant="destructive"
        onConfirm={() => {
          if (deleteListId) {
            deleteShoppingList.mutate(deleteListId);
            setDeleteListId(null);
          }
        }}
      />

      <PantrySettingsSheet
        open={showPantrySettings}
        onOpenChange={setShowPantrySettings}
      />

      <AIActionSheet
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        initialPrompt="Based on my current pantry inventory, what staples are running low and what should I add to my shopping list this week?"
      />
    </div>
  );
};

export default Grocery;