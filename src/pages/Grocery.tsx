import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, ListChecks, Package, Sparkles, ShoppingCart, ScanLine } from "lucide-react";
import { PantryItemCard } from "@/components/grocery/PantryItemCard";
import { AddPantryItemDialog } from "@/components/grocery/AddPantryItemDialog";
import { QuickAddChecklist } from "@/components/grocery/QuickAddChecklist";
import { PantryFilters } from "@/components/grocery/PantryFilters";
import { AIPantryImportDialog } from "@/components/grocery/AIPantryImportDialog";
import { ScanBillDialog, type ScannedBill } from "@/components/grocery/ScanBillDialog";
import { BillReviewDialog } from "@/components/grocery/BillReviewDialog";
import { ShoppingListCard } from "@/components/grocery/ShoppingListCard";
import { CreateShoppingListDialog } from "@/components/grocery/CreateShoppingListDialog";
import { PantryEducationBanner } from "@/components/grocery/PantryEducationBanner";
import { ExpiringItemsAlert } from "@/components/grocery/ExpiringItemsAlert";
import { LowStockAlert } from "@/components/grocery/LowStockAlert";
import { PantryCategorySection } from "@/components/grocery/PantryCategorySection";
import { ShoppingListDetailView } from "@/components/grocery/ShoppingListDetailView";
import { PantryAnalytics } from "@/components/grocery/PantryAnalytics";
import { PantryCategoryGrid } from "@/components/grocery/PantryCategoryGrid";
import { PantryCategoryDetail } from "@/components/grocery/PantryCategoryDetail";
import { FloatingCartButton } from "@/components/grocery/FloatingCartButton";
import { usePantryItems } from "@/hooks/usePantryItems";
import { usePantryCategories } from "@/hooks/usePantryCategories";
import { usePantryStats } from "@/hooks/usePantryStats";
import { useShoppingLists } from "@/hooks/useShoppingLists";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureTour } from "@/hooks/useFeatureTour";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Step } from "react-joyride";
import type { PantryItem } from "@/hooks/usePantryItems";

const groceryTourSteps: Step[] = [
  {
    target: "body",
    content: "Welcome to Grocery! Keep track of what's in your pantry and what you need to buy.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='ai-import']",
    content: "Describe what's in your kitchen and let AI organize it for you.",
    placement: "bottom",
  },
  {
    target: "[data-tour='quick-add']",
    content: "Quickly add common pantry staples with one tap.",
    placement: "bottom",
  },
  {
    target: "[role='tablist']",
    content: "Switch between your pantry inventory, shopping lists, and usage insights.",
    placement: "bottom",
  },
  {
    target: "[data-tour='category-grid']",
    content: "Browse items by category. We'll flag anything that's running low or expiring soon.",
    placement: "top",
  },
  {
    target: ".user-menu",
    content: "You can restart this guide anytime from the menu.",
    placement: "bottom",
  },
];

const Grocery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { householdId } = useHousehold();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { pantryItems, isLoading, addPantryItem, updatePantryItem, deletePantryItem, bulkAddItems } = usePantryItems(householdId);
  const { categories, isLoading: categoriesLoading, initializeDefaultCategories } = usePantryCategories(householdId);
  const { stats } = usePantryStats(householdId);
  const { shoppingLists, createShoppingList, completeShoppingList, deleteShoppingList, toggleItemChecked, deleteItem } = useShoppingLists(householdId);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAIImport, setShowAIImport] = useState(false);
  const [showScanBill, setShowScanBill] = useState(false);
  const [scannedBill, setScannedBill] = useState<ScannedBill | null>(null);
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteListId, setDeleteListId] = useState<string | null>(null);
  
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("grocery");
  const [runOnboarding, setRunOnboarding] = useState(false);

  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  useEffect(() => {
    if (householdId && categories.length === 0 && !categoriesLoading) {
      initializeDefaultCategories.mutate(householdId);
    }
  }, [householdId, categories.length, categoriesLoading]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => {
    setRunOnboarding(false);
    markTourComplete();
  };

  const handleAddItem = (item: Partial<PantryItem>) => {
    if (!householdId || !user?.id) return;
    
    if (editItem) {
      updatePantryItem.mutate({ id: editItem.id, updates: item });
      setEditItem(null);
    } else {
      addPantryItem.mutate({ ...item, household_id: householdId, added_by: user.id });
    }
  };

  const handleEditItem = (item: PantryItem) => {
    setEditItem(item);
    setShowAddDialog(true);
  };

  const handleDeleteItem = (id: string) => {
    setDeleteItemId(id);
  };

  const confirmDeleteItem = () => {
    if (deleteItemId) {
      deletePantryItem.mutate(deleteItemId);
      setDeleteItemId(null);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    updatePantryItem.mutate({ id, updates: { quantity } });
  };

  const handleBulkAdd = (items: Partial<PantryItem>[]) => {
    if (!householdId || !user?.id) return;
    const itemsWithRequired = items.map(item => ({
      ...item,
      household_id: householdId,
      added_by: user.id,
    }));
    bulkAddItems.mutate(itemsWithRequired);
  };

  const handleAIImport = (items: Partial<PantryItem>[]) => {
    if (!householdId || !user?.id) return;
    const itemsWithRequired = items.map(item => ({
      ...item,
      household_id: item.household_id || householdId,
      added_by: item.added_by || user.id,
    }));
    bulkAddItems.mutate(itemsWithRequired);
  };

  const handleCreateList = (name: string) => {
    if (!householdId || !user?.id) return;
    createShoppingList.mutate({
      household_id: householdId,
      name,
      created_by: user.id,
    });
  };

  const handleGenerateFromMealPlan = async () => {
    if (!householdId || !user?.id) return;
    
    setIsGeneratingList(true);
    try {
      const today = new Date();
      const sunday = new Date(today);
      sunday.setDate(today.getDate() - today.getDay());
      const weekStartDate = sunday.toISOString().split('T')[0];

      const { data: mealPlans } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("household_id", householdId)
        .eq("week_start_date", weekStartDate)
        .maybeSingle();

      if (!mealPlans) {
        toast({
          title: "No meal plan found",
          description: "Generate a meal plan for this week first, then we can create a shopping list from it.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke("generate-shopping-list", {
        body: {
          householdId,
          mealPlanId: mealPlans.id,
          userId: user.id,
        },
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
      
      toast({
        title: "Shopping list ready! 🛒",
        description: `${data.itemCount} items added based on this week's meals.`,
      });
    } catch (error: any) {
      console.error("Error generating shopping list:", error);
      toast({
        title: "Something went wrong",
        description: error.message || "We couldn't generate the shopping list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingList(false);
    }
  };

  const handleCompleteList = (listId: string) => {
    completeShoppingList.mutate(listId);
  };

  const handleDeleteList = (listId: string) => {
    setDeleteListId(listId);
  };

  const confirmDeleteList = () => {
    if (deleteListId) {
      deleteShoppingList.mutate(deleteListId);
      setDeleteListId(null);
    }
  };

  const filteredItems = pantryItems.filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (selectedStatus === "staples" && !item.is_staple) return false;
    if (selectedStatus === "low-stock") {
      const qty = item.quantity || 0;
      const minQty = item.minimum_quantity || 0;
      if (minQty === 0 || qty > minQty) return false;
    }
    if (selectedStatus === "expiring") {
      if (!item.expiry_date) return false;
      const now = new Date();
      const expiryDate = new Date(item.expiry_date);
      const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) return false;
    }
    return true;
  });

  const expiringItems = pantryItems.filter(item => {
    if (!item.expiry_date) return false;
    const expiryDate = new Date(item.expiry_date);
    const now = new Date();
    const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  });

  const lowStockItems = pantryItems.filter(item => {
    const qty = item.quantity || 0;
    const minQty = item.minimum_quantity || 0;
    return minQty > 0 && qty <= minQty;
  });

  const groupedItems = useMemo(() => {
    const groups: Record<string, PantryItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const sortedCategories = useMemo(() => {
    return categories
      .filter((cat) => groupedItems[cat.name])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [categories, groupedItems]);

  const selectedListId = searchParams.get("list");
  const selectedList = shoppingLists.find((list) => list.id === selectedListId);

  const handleToggleItem = (itemId: string, isChecked: boolean) => {
    if (!user?.id) return;
    toggleItemChecked.mutate({ id: itemId, is_checked: isChecked, user_id: user.id });
  };

  const handleBackToLists = () => {
    setSearchParams({});
  };

  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategoryDetail(categoryName);
  };

  const handleBackToCategories = () => {
    setSelectedCategoryDetail(null);
  };

  const handleAddToCart = async (itemIds: string[]) => {
    if (!householdId || !user?.id) return;
    
    let activeList = shoppingLists.find(list => list.status === "active");
    
    if (!activeList) {
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert([{
          household_id: householdId,
          name: `Shopping List — ${new Date().toLocaleDateString()}`,
          created_by: user.id,
          status: "active",
        }])
        .select()
        .single();
      
      if (error) {
        toast({ title: "Something went wrong", description: "Couldn't create a shopping list.", variant: "destructive" });
        return;
      }
      
      activeList = data as any;
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
    }
    
    const itemsToAdd = pantryItems.filter(item => itemIds.includes(item.id));
    
    const shoppingItems = itemsToAdd.map(item => ({
      list_id: activeList!.id,
      name: item.name,
      quantity: item.minimum_quantity || 1,
      unit: item.unit,
      category: item.category,
      is_checked: false,
      pantry_item_id: item.id,
      recipe_source: null,
    }));
    
    const { error: itemsError } = await supabase
      .from("shopping_list_items")
      .insert(shoppingItems);
    
    if (itemsError) {
      toast({ title: "Something went wrong", description: "Couldn't add items to the list.", variant: "destructive" });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
    setCartItemCount(prev => prev + itemsToAdd.length);
    
    toast({
      title: "Added to shopping list",
      description: `${itemsToAdd.length} item${itemsToAdd.length !== 1 ? 's' : ''} ready to buy.`,
    });
  };

  const handleViewCart = () => {
    const activeList = shoppingLists.find(list => list.status === "active");
    if (activeList) {
      setSearchParams({ list: activeList.id });
    }
  };

  const categoryItems = useMemo(() => {
    if (!selectedCategoryDetail) return [];
    return pantryItems.filter(item => 
      item.category === selectedCategoryDetail || 
      (selectedCategoryDetail === "Other" && !item.category)
    );
  }, [selectedCategoryDetail, pantryItems]);

  if (!user || !householdId) {
    return (
      <div className="page-container">
        <Header onStartOnboarding={handleStartOnboarding} />
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

  return (
    <div className="page-container">
      <Header onStartOnboarding={handleStartOnboarding} />
      <main className="page-content flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="page-heading">Grocery</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pantryItems.length > 0 ? `${pantryItems.length} items in your pantry` : "Start building your pantry inventory"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAIImport(true)}
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
          </div>
        </div>

        <Tabs defaultValue="pantry" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pantry" className="gap-2">
              <Package className="h-4 w-4" aria-hidden="true" />
              Pantry
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Shopping
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pantry" className="space-y-6">
            {isLoading ? (
              <EmptyState icon={Package} title="Loading your pantry..." />
            ) : pantryItems.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Your pantry is empty"
                description="Add items to track what you have at home and know what to buy."
                encouragement="Try AI Import to add everything at once!"
                action={{ label: "Add Item", onClick: () => setShowAddDialog(true) }}
                secondaryAction={{ label: "Quick Add Staples", onClick: () => setShowQuickAdd(true) }}
              />
            ) : selectedCategoryDetail ? (
              <PantryCategoryDetail
                categoryName={selectedCategoryDetail}
                categoryIcon={categories.find(c => c.name === selectedCategoryDetail)?.icon || undefined}
                items={categoryItems}
                onBack={handleBackToCategories}
                onQuantityChange={handleUpdateQuantity}
                onAddToCart={handleAddToCart}
              />
            ) : (
              <div data-tour="category-grid">
                <PantryCategoryGrid
                  categories={categories}
                  items={pantryItems}
                  onSelectCategory={handleSelectCategory}
                />
              </div>
            )}
            
            <FloatingCartButton
              itemCount={cartItemCount}
              onClick={handleViewCart}
            />
          </TabsContent>

          <TabsContent value="shopping" className="space-y-6">
            {selectedList ? (
              <ShoppingListDetailView
                list={selectedList}
                onBack={handleBackToLists}
                onToggleItem={handleToggleItem}
                onDeleteItem={(itemId) => deleteItem.mutate(itemId)}
                userId={user?.id || ""}
              />
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Create lists manually or generate them from your meal plan.
                  </p>
                  <Button onClick={() => setShowCreateList(true)} className="gap-2">
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Create List
                  </Button>
                </div>

                {shoppingLists.length === 0 ? (
                  <EmptyState
                    icon={ShoppingCart}
                    title="No shopping lists yet"
                    description="Create a list for your next grocery run, or generate one from your meal plan."
                    action={{ label: "Create List", onClick: () => setShowCreateList(true) }}
                    secondaryAction={{ label: "From Meal Plan", onClick: handleGenerateFromMealPlan }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shoppingLists.map((list) => (
                      <ShoppingListCard
                        key={list.id}
                        list={list}
                        onDelete={handleDeleteList}
                        onComplete={handleCompleteList}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <PantryEducationBanner />
            
            {expiringItems.length > 0 && (
              <ExpiringItemsAlert items={expiringItems} />
            )}

            {lowStockItems.length > 0 && (
              <LowStockAlert items={lowStockItems} />
            )}

            <PantryAnalytics
              pantryItems={pantryItems}
              shoppingLists={shoppingLists}
            />
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

      <AIPantryImportDialog
        open={showAIImport}
        onOpenChange={setShowAIImport}
        onItemsExtracted={handleAIImport}
        householdId={householdId}
        userId={user.id}
      />

      <CreateShoppingListDialog
        open={showCreateList}
        onOpenChange={setShowCreateList}
        onSubmit={handleCreateList}
        onGenerateFromMealPlan={handleGenerateFromMealPlan}
      />

      <ConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(open) => !open && setDeleteItemId(null)}
        title="Remove this item?"
        description="It will be removed from your pantry inventory."
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmDeleteItem}
      />

      <ConfirmDialog
        open={!!deleteListId}
        onOpenChange={(open) => !open && setDeleteListId(null)}
        title="Delete this shopping list?"
        description="The list and all its items will be permanently removed."
        confirmLabel="Delete List"
        variant="destructive"
        onConfirm={confirmDeleteList}
      />

      <OnboardingTour 
        run={runOnboarding} 
        onComplete={handleOnboardingComplete} 
        steps={groceryTourSteps}
        featureName="grocery"
      />
    </div>
  );
};

import { ModuleSetupGate } from "@/components/onboarding/ModuleSetupGate";
const GroceryWithGate = () => (
  <ModuleSetupGate module="grocery_setup">
    <Grocery />
  </ModuleSetupGate>
);
export default GroceryWithGate;
