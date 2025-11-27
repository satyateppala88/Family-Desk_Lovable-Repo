import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, ListChecks, Package } from "lucide-react";
import { PantryItemCard } from "@/components/grocery/PantryItemCard";
import { AddPantryItemDialog } from "@/components/grocery/AddPantryItemDialog";
import { QuickAddChecklist } from "@/components/grocery/QuickAddChecklist";
import { PantryFilters } from "@/components/grocery/PantryFilters";
import { usePantryItems } from "@/hooks/usePantryItems";
import { usePantryCategories } from "@/hooks/usePantryCategories";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/contexts/AuthContext";
import type { Step } from "react-joyride";
import type { PantryItem } from "@/hooks/usePantryItems";

const Grocery = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { pantryItems, isLoading, addPantryItem, updatePantryItem, deletePantryItem, bulkAddItems } = usePantryItems(householdId);
  const { categories, isLoading: categoriesLoading, initializeDefaultCategories } = usePantryCategories(householdId);
  
  const [runOnboarding, setRunOnboarding] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editItem, setEditItem] = useState<PantryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Initialize default categories if none exist
  useEffect(() => {
    if (householdId && categories.length === 0 && !categoriesLoading) {
      initializeDefaultCategories.mutate(householdId);
    }
  }, [householdId, categories.length, categoriesLoading]);

  const handleStartOnboarding = () => setRunOnboarding(true);
  const handleOnboardingComplete = () => setRunOnboarding(false);

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

  const groceryTourSteps: Step[] = [
    {
      target: "body",
      content: "Welcome to Grocery Management! Manage your pantry inventory and shopping lists all in one place.",
      placement: "center",
    },
  ];

  if (!user || !householdId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header onStartOnboarding={handleStartOnboarding} />
        <main className="container px-4 py-6 pb-20">
          <p className="text-muted-foreground">Please log in and join a household to access grocery management.</p>
        </main>
        <Footer />
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onStartOnboarding={handleStartOnboarding} />
      <main className="container px-4 py-6 pb-20 flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Grocery Management</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowQuickAdd(true)}
              className="gap-2"
            >
              <ListChecks className="h-4 w-4" />
              Quick Add
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        <Tabs defaultValue="pantry" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pantry" className="gap-2">
              <Package className="h-4 w-4" />
              Pantry
            </TabsTrigger>
            <TabsTrigger value="shopping" className="gap-2">
              Shopping Lists
              <span className="text-xs text-muted-foreground">(Coming Soon)</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-2">
              Insights
              <span className="text-xs text-muted-foreground">(Coming Soon)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pantry" className="space-y-6">
            <PantryFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              categories={categories}
            />

            {isLoading ? (
              <p className="text-center text-muted-foreground">Loading pantry items...</p>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {pantryItems.length === 0 ? "No items in your pantry yet" : "No items match your filters"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {pantryItems.length === 0 
                    ? "Start by adding items individually or use Quick Add for common items."
                    : "Try adjusting your search or filters."}
                </p>
                {pantryItems.length === 0 && (
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => setShowQuickAdd(true)}>
                      Quick Add from Checklist
                    </Button>
                    <Button onClick={() => setShowAddDialog(true)}>
                      Add Individual Item
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <PantryItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onUpdateQuantity={handleUpdateQuantity}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shopping">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Shopping Lists feature coming soon!</p>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <div className="text-center py-12">
              <p className="text-muted-foreground">Insights and alerts coming soon!</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <MobileNav />
      
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

      <OnboardingTour 
        run={runOnboarding} 
        onComplete={handleOnboardingComplete} 
        steps={groceryTourSteps}
      />
    </div>
  );
};

export default Grocery;
