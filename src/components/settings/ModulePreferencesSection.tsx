import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw, UtensilsCrossed, ShoppingCart, Wallet,
  Sparkles, Calendar, ListChecks,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useEnabledProducts, type ProductName } from "@/hooks/useEnabledProducts";
import { useHousehold } from "@/hooks/useHousehold";
import { useHouseholdPreferences } from "@/hooks/useHouseholdPreferences";
import { MODULE_SETUP_KEYS, type ModuleSetupKey } from "@/lib/moduleSetup";
import { EditMealsPreferencesDialog } from "./EditMealsPreferencesDialog";
import { EditGroceryPreferencesDialog } from "./EditGroceryPreferencesDialog";
import { EditBudgetPreferencesDialog } from "./EditBudgetPreferencesDialog";
import { EditCalendarPreferencesDialog } from "./EditCalendarPreferencesDialog";
import { EditHabitsTasksPreferencesDialog } from "./EditHabitsTasksPreferencesDialog";
import { toast } from "sonner";
import type { HouseholdPreferences } from "@/types/database";

const MODULE_META: Record<ProductName, { label: string; description: string; icon: typeof UtensilsCrossed }> = {
  meals:    { label: "Meals",    description: "Diet, allergies, cooking habits",   icon: UtensilsCrossed },
  grocery:  { label: "Grocery",  description: "Pantry size, shopping cadence",     icon: ShoppingCart },
  finance:  { label: "Finance",  description: "Budget & spending preferences",     icon: Wallet },
  habits:   { label: "Habits",   description: "Routine & focus areas",             icon: Sparkles },
  calendar: { label: "Calendar", description: "Work schedule & festivals",         icon: Calendar },
  tasks:    { label: "Tasks",    description: "Preferred task time",               icon: ListChecks },
};

const ORDER: ProductName[] = ["meals", "grocery", "finance", "habits", "calendar", "tasks"];

const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "Not set";
  if (Array.isArray(v)) return v.length === 0 ? "None" : v.join(", ");
  if (typeof v === "string") return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return String(v);
};

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium truncate">{fmt(value)}</p>
  </div>
);

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

  const renderSummary = (product: ProductName, p: HouseholdPreferences) => {
    switch (product) {
      case "meals":
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Diet" value={p.diet_type} />
            <Field label="Spice level" value={p.spice_level} />
            <Field label="Allergies" value={p.food_allergies} />
            <Field label="Cooking time" value={p.weekday_cooking_time} />
            <div className="col-span-2"><Field label="Cuisines" value={p.regional_cuisines} /></div>
          </div>
        );
      case "grocery":
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Pantry size" value={p.pantry_size} />
            <Field label="Shopping" value={p.shopping_frequency} />
            <Field label="Organic" value={p.organic_preference} />
            <div className="col-span-2"><Field label="Locations" value={p.shopping_locations} /></div>
          </div>
        );
      case "finance":
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Monthly grocery budget" value={p.monthly_grocery_budget} />
            <Field label="Budget strictness" value={p.budget_consciousness} />
          </div>
        );
      case "habits":
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Preferred time" value={p.preferred_task_time} />
            <div className="col-span-2"><Field label="Focus areas" value={p.household_concerns} /></div>
          </div>
        );
      case "tasks":
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Preferred time" value={p.preferred_task_time} />
          </div>
        );
      case "calendar":
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Work schedule" value={p.work_schedule} />
            <Field label="Festivals" value={p.festival_importance} />
          </div>
        );
    }
  };

  const renderEditor = (product: ProductName) => {
    const props = { preferences, onSave: updatePreferences, isUpdating };
    switch (product) {
      case "meals":    return <EditMealsPreferencesDialog {...props} />;
      case "grocery":  return <EditGroceryPreferencesDialog {...props} />;
      case "finance":  return <EditBudgetPreferencesDialog {...props} />;
      case "calendar": return <EditCalendarPreferencesDialog {...props} />;
      case "habits":   return <EditHabitsTasksPreferencesDialog {...props} scope="habits" />;
      case "tasks":    return <EditHabitsTasksPreferencesDialog {...props} scope="tasks" />;
    }
  };

  const visible = ORDER.filter((p) => enabledProducts.includes(p));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Module preferences</h2>
        <p className="text-sm text-muted-foreground">
          Each card shows only the inputs for that enabled module.
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
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {meta.label}
                      <Badge variant="secondary" className="text-xs font-normal">enabled</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{meta.description}</CardDescription>
                  </div>
                </div>
                {renderEditor(p)}
              </CardHeader>
              <CardContent className="space-y-4">
                {renderSummary(p, preferences)}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resetSetup(setupKey)}
                    className="text-xs text-muted-foreground"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Re-run setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
