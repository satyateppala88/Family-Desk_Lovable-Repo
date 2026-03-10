import { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks, Package, Sparkles, ShoppingCart } from "lucide-react";
import { PantryItemCard } from "@/components/grocery/PantryItemCard";
import { AddPantryItemDialog } from "@/components/grocery/AddPantryItemDialog";
import { QuickAddChecklist } from "@/components/grocery/QuickAddChecklist";
import { PantryFilters } from "@/components/grocery/PantryFilters";
import { AIPantryImportDialog } from "@/components/grocery/AIPantryImportDialog";
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
    content: "Welcome to Grocery Management! Track your pantry and shopping lists.",
    placement: "center",
    disableBeacon: true,
  },
  {
    target: "[data-tour='ai-import']",
    content: "Use AI to quickly import multiple pantry items by describing what you have.",
    placement: "bottom",
  },
  {
    target: "[data-tour='quick-add']",
    content: "Quick add common Indian pantry staples with one click.",
    placement: "bottom",
  },
  {
    target: "[role='tablist']",
    content: "Switch between Pantry to manage inventory, Shopping Lists for upcoming purchases, and Insights for usage analytics.",
    placement: "bottom",
  },
  {
    target: "[data-tour='category-grid']",
    content: "Browse items by category. Low stock and expiring items are highlighted.",
    placement: "top",
  },
  {
    target: ".user-menu",
    content: "Access settings and restart this tour anytime from the User Guide menu.",
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
  const [showCreateList, setShowCreateList] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  
  // New quick commerce UI state
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState(0);

  // Feature-specific tour
  const { shouldShowTour, tourChecked, markTourComplete } = useFeatureTour("grocery");
  const [runOnboarding, setRunOnboarding] = useState(false);

  // Start tour automatically if user hasn't seen it
  useEffect(() => {
    if (tourChecked && shouldShowTour && householdId) {
      setTimeout(() => setRunOnboarding(true), 500);
    }
  }, [tourChecked, shouldShowTour, householdId]);

  // Initialize default categories if none exist
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
    if (confirm("Are you sure you want to delete this item?")) {
      deletePantryItem.mutate(id);
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
    
    // Items from AI already have household_id and added_by set
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
      // Get current week's meal plan
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
          description: "Generate a meal plan for this week first.",
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
        title: "Shopping list created",
        description: `Generated list with ${data.itemCount} items from your meal plan.`,
      });
    } catch (error: any) {
      console.error("Error generating shopping list:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate shopping list.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingList(false);
    }
  };

  const handleCompleteList = (listId: string) => {
    if (confirm("Mark this shopping list as completed?")) {
      completeShoppingList.mutate(listId);
    }
  };

  const handleDeleteList = (listId: string) => {
    if (confirm("Delete this shopping list?")) {
      deleteShoppingList.mutate(listId);
    }
  };

  // Filter items based on search and filters
  const filteredItems = pantryItems.filter((item) => {
    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (selectedStatus === "staples" && !item.is_staple) {
      return false;
    }

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

  // Get expiring and low stock items for alerts
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

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, PantryItem[]> = {};
    
    filteredItems.forEach((item) => {
      const category = item.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    return groups;
  }, [filteredItems]);

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return categories
      .filter((cat) => groupedItems[cat.name])
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [categories, groupedItems]);

  // Shopping list detail view
  const selectedListId = searchParams.get("list");
  const selectedList = shoppingLists.find((list) => list.id === selectedListId);

  const handleToggleItem = (itemId: string, isChecked: boolean) => {
    if (!user?.id) return;
    toggleItemChecked.mutate({ id: itemId, is_checked: isChecked, user_id: user.id });
  };

  const handleBackToLists = () => {
    setSearchParams({});
  };

  // Quick commerce UI handlers
  const handleSelectCategory = (categoryName: string) => {
    setSelectedCategoryDetail(categoryName);
  };

  const handleBackToCategories = () => {
    setSelectedCategoryDetail(null);
  };

  const handleAddToCart = async (itemIds: string[]) => {
    if (!householdId || !user?.id) return;
    
    // Find or create active shopping list
    let activeList = shoppingLists.find(list => list.status === "active");
    
    if (!activeList) {
      // Create a new list
      const { data, error } = await supabase
        .from("shopping_lists")
        .insert([{
          household_id: householdId,
          name: `Shopping List - ${new Date().toLocaleDateString()}`,
          created_by: user.id,
          status: "active",
        }])
        .select()
        .single();
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to create shopping list.",
          variant: "destructive",
        });
        return;
      }
      
      activeList = data as any;
      queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
    }
    
    // Get items to add
    const itemsToAdd = pantryItems.filter(item => itemIds.includes(item.id));
    
    // Add items to shopping list
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
      toast({
        title: "Error",
        description: "Failed to add items to shopping list.",
        variant: "destructive",
      });
      return;
    }
    
    queryClient.invalidateQueries({ queryKey: ["shopping-lists", householdId] });
    setCartItemCount(prev => prev + itemsToAdd.length);
    
    toast({
      title: "Added to cart",
      description: `${itemsToAdd.length} item${itemsToAdd.length !== 1 ? 's' : ''} added to shopping list.`,
    });
  };

  const handleViewCart = () => {
    const activeList = shoppingLists.find(list => list.status === "active");
    if (activeList) {
      setSearchParams({ list: activeList.id });
    }
  };

  // Get items for selected category
  const categoryItems = useMemo(() => {
    if (!selectedCategoryDetail) return [];
    return pantryItems.filter(item => 
      item.category === selectedCategoryDetail || 
      (selectedCategoryDetail === "Other" && !item.category)
    );
  }, [selectedCategoryDetail, pantryItems]);

  // groceryTourSteps is now defined at the top of the file

  if (!user || !householdId) {
    return (
      <div className="page-container">
        <Header onStartOnboarding={handleStartOnboarding} />
        <main className="page-content">
          <p className="text-muted-foreground">Please log in and join a household to access grocery management.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />
      <main className="container px-4 py-3 sm:py-4 pb-20 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-xl sm:text-2xl font-bold">Grocery Management</h1>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAIImport(true)}
              className="gap-2 h-9"
              size="sm"
              data-tour="ai-import"
            >
              <Sparkles className="h-4 w-4" />
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
              <ListChecks className="h-4 w-4" />
              <span className="hidden xs:inline">Quick Add</span>
              <span className="xs:hidden">Quick</span>
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2 h-9" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Add Item</span>
              <span className="xs:hidden">Add</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pantry" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pantry" className="gap-2">
              <Package className="h-4 w-4" />
              Pantry
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Shopping Lists
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pantry" className="space-y-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading pantry items...</p>
            ) : pantryItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No items in your pantry yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding items individually or use Quick Add for common items.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setShowQuickAdd(true)}>
                    Quick Add from Checklist
                  </Button>
                  <Button onClick={() => setShowAddDialog(true)}>
                    Add Individual Item
                  </Button>
                </div>
              </div>
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
                    Manage your shopping lists and generate them from your meal plans.
                  </p>
                  <Button onClick={() => setShowCreateList(true)} className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Create List
                  </Button>
                </div>

                {shoppingLists.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No shopping lists yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create a list manually or generate from your meal plan.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => setShowCreateList(true)}>
                        Create Manual List
                      </Button>
                      <Button onClick={handleGenerateFromMealPlan} disabled={isGeneratingList}>
                        {isGeneratingList ? "Generating..." : "Generate from Meal Plan"}
                      </Button>
                    </div>
                  </div>
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
      <Footer />
      
      
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

      <OnboardingTour 
        run={runOnboarding} 
        onComplete={handleOnboardingComplete} 
        steps={groceryTourSteps}
        featureName="grocery"
      />
    </div>
  );
};

export default Grocery;
