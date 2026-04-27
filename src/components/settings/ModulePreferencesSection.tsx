import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, UtensilsCrossed, ShoppingCart, Wallet, Sparkles, Calendar, ListChecks } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useEnabledProducts, type ProductName } from "@/hooks/useEnabledProducts";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { MODULE_SETUP_KEYS, type ModuleSetupKey } from "@/lib/moduleSetup";
import { EditDietaryPreferencesDialog } from "./EditDietaryPreferencesDialog";
import { EditCookingPreferencesDialog } from "./EditCookingPreferencesDialog";
import { EditBudgetPreferencesDialog } from "./EditBudgetPreferencesDialog";
import { EditRoutinePreferencesDialog } from "./EditRoutinePreferencesDialog";
import { toast } from "sonner";
import { type ReactNode } from "react";

const MODULE_META: Record<ProductName, { label: string; description: string; icon: typeof UtensilsCrossed }> = {
  meals: { label: "Meals", description: "Diet, allergies, cooking habits", icon: UtensilsCrossed },
  grocery: { label: "Grocery", description: "Pantry size, shopping cadence", icon: ShoppingCart },
  finance: { label: "Finance", description: "Budget & spending preferences", icon: Wallet },
  habits: { label: "Habits", description: "Routine & focus areas", icon: Sparkles },
  calendar: { label: "Calendar", description: "Work schedule & festivals", icon: Calendar },
  tasks: { label: "Tasks", description: "Preferred task time", icon: ListChecks },
};

export const ModulePreferencesSection = () => {
  const { user } = useAuth();
  const { householdId } = useHousehold();
  const { data: enabledProducts } = useEnabledProducts(householdId);
  const { preferences, updatePreferences, isUpdating } = useHouseholdPreferences(householdId);
  const queryClient = useQueryClient();

  if (!enabledProducts || enabledProducts.length === 0 || !preferences) return null;

  const resetSetup = async (key: ModuleSetupKey) => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("completed_tours")
        .eq("id", user.id)
        .single();
      const tours = (data?.completed_tours as Record<string, boolean>) || {};
      await supabase
        .from("profiles")
        .update({ completed_tours: { ...tours, [key]: false } })
        .eq("id", user.id);
      queryClient.invalidateQueries({ queryKey: ["module-setup", user.id] });
      queryClient.invalidateQueries({ queryKey: ["completed-tours", user.id] });
      toast.success("Setup will replay next time you open this module");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reset setup");
    }
  };

  const renderEditors = (product: ProductName): ReactNode => {
    switch (product) {
      case "meals":
        return (
          <div className="flex flex-wrap gap-2">
            <EditDietaryPreferencesDialog preferences={preferences} onSave={updatePreferences} isUpdating={isUpdating} />
            <EditCookingPreferencesDialog preferences={preferences} onSave={updatePreferences} isUpdating={isUpdating} />
          </div>
        );
      case "grocery":
        return (
          <EditCookingPreferencesDialog preferences={preferences} onSave={updatePreferences} isUpdating={isUpdating} />
        );
      case "finance":
        return (
          <EditBudgetPreferencesDialog preferences={preferences} onSave={updatePreferences} isUpdating={isUpdating} />
        );
      case "habits":
      case "tasks":
      case "calendar":
        return (
          <EditRoutinePreferencesDialog preferences={preferences} onSave={updatePreferences} isUpdating={isUpdating} />
        );
    }
  };

  // Stable display order
  const order: ProductName[] = ["meals", "grocery", "finance", "habits", "calendar", "tasks"];
  const visible = order.filter((p) => enabledProducts.includes(p));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Module preferences</h2>
        <p className="text-sm text-muted-foreground">
          Only the modules you've enabled appear here. Each opens its own focused editor.
        </p>
      </div>

      <div className="grid gap-3">
        {visible.map((p) => {
          const meta = MODULE_META[p];
          const Icon = meta.icon;
          const setupKey = MODULE_SETUP_KEYS[p];
          return (
            <Card key={p}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {meta.label}
                      <Badge variant="secondary" className="text-xs font-normal">enabled</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{meta.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                {renderEditors(p)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resetSetup(setupKey)}
                  className="text-xs text-muted-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Re-run setup
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
