import { useState } from "react";
import { Header } from "@/components/layout/Header";

import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHousehold } from "@/hooks/useHousehold";
import { useEnabledProducts, ProductName } from "@/hooks/useEnabledProducts";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, ChefHat, Calendar, ShoppingCart, Leaf, Wallet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModuleSetupQueue } from "@/components/onboarding/ModuleSetupQueue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const products = [
  {
    name: "tasks" as ProductName,
    icon: CheckSquare,
    label: "Tasks",
    description: "Manage and track household tasks",
    color: "hsl(var(--primary))",
  },
  {
    name: "meals" as ProductName,
    icon: ChefHat,
    label: "Meals",
    description: "AI-powered meal planning",
    color: "hsl(var(--accent))",
  },
  {
    name: "calendar" as ProductName,
    icon: Calendar,
    label: "Calendar",
    description: "Track events and schedules",
    color: "hsl(215, 75%, 55%)",
  },
  {
    name: "grocery" as ProductName,
    icon: ShoppingCart,
    label: "Grocery",
    description: "Shopping lists and pantry",
    color: "hsl(145, 65%, 45%)",
  },
  {
    name: "habits" as ProductName,
    icon: Leaf,
    label: "Habits",
    description: "Build healthy household routines",
    color: "hsl(142, 70%, 45%)",
  },
  {
    name: "finance" as ProductName,
    icon: Wallet,
    label: "Finance",
    description: "Budgets, subscriptions, savings & cards",
    color: "hsl(168, 35%, 38%)",
  },
];

export default function HouseholdProductSettings() {
  const { householdId } = useHousehold();
  const { data: enabledProducts = [], isLoading } = useEnabledProducts(householdId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [productToDisable, setProductToDisable] = useState<ProductName | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [setupForProduct, setSetupForProduct] = useState<ProductName | null>(null);

  const handleEnableProduct = async (productName: ProductName) => {
    if (!householdId) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("household_enabled_products")
        .insert({
          household_id: householdId,
          product_name: productName,
        });

      if (error) throw error;

      toast({
        title: "Product enabled",
        description: `${productName.charAt(0).toUpperCase() + productName.slice(1)} has been enabled.`,
      });

      queryClient.invalidateQueries({ queryKey: ["enabled-products"] });
      // Trigger the per-module first-enable setup right away. The dialog
      // auto-skips silently if the household already has the relevant data
      // (handled by useModuleSetup's hasRequiredData backfill).
      setSetupForProduct(productName);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableProduct = async () => {
    if (!householdId || !productToDisable) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("household_enabled_products")
        .delete()
        .eq("household_id", householdId)
        .eq("product_name", productToDisable);

      if (error) throw error;

      toast({
        title: "Product disabled",
        description: `${productToDisable.charAt(0).toUpperCase() + productToDisable.slice(1)} has been disabled.`,
      });

      queryClient.invalidateQueries({ queryKey: ["enabled-products"] });
      setProductToDisable(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const isProductEnabled = (productName: ProductName) => {
    return enabledProducts.includes(productName);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Manage Products</h1>
            <p className="text-muted-foreground">
              Enable or disable features for your household
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product) => {
                const Icon = product.icon;
                const enabled = isProductEnabled(product.name);

                return (
                  <Card key={product.name} className="relative">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="h-6 w-6" style={{ color: product.color }} />
                          <CardTitle>{product.label}</CardTitle>
                        </div>
                        {enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{product.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {enabled ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setProductToDisable(product.name)}
                          disabled={actionLoading || enabledProducts.length === 1}
                        >
                          Disable
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleEnableProduct(product.name)}
                          disabled={actionLoading}
                        >
                          Enable
                        </Button>
                      )}
                      {enabled && enabledProducts.length === 1 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          At least one product must be enabled
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      

      <AlertDialog open={!!productToDisable} onOpenChange={() => setProductToDisable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable {productToDisable}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the {productToDisable} feature from your household. Your data will be preserved and you can re-enable it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisableProduct}>
              Disable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {setupForProduct && (
        <ModuleSetupQueue
          products={[setupForProduct]}
          onAllDone={() => setSetupForProduct(null)}
        />
      )}
    </div>
  );
}
