/**
 * Per-module first-run setup configuration.
 *
 * Completion is tracked in `profiles.completed_tours` (JSONB) using the
 * keys defined in `ModuleSetupKey`. Reusing this column avoids a migration
 * and keeps tour-vs-setup state colocated.
 */
import type { ProductName } from "@/hooks/useEnabledProducts";

export type ModuleSetupKey =
  | "meals_setup"
  | "grocery_setup"
  | "finance_setup"
  | "habits_setup"
  | "calendar_setup";

export const MODULE_SETUP_KEYS: Partial<Record<ProductName, ModuleSetupKey>> = {
  meals: "meals_setup",
  grocery: "grocery_setup",
  finance: "finance_setup",
  habits: "habits_setup",
  calendar: "calendar_setup",
  // Tasks intentionally has no setup questionnaire — `/tasks` should never
  // surface another module's modal.
};

import type { HouseholdPreferences } from "@/types/database";
import type { LucideIcon } from "lucide-react";
import { UtensilsCrossed, ShoppingCart, Wallet, Leaf, Calendar } from "lucide-react";

/**
 * Fields that the per-module setup is responsible for capturing.
 * Used to decide if a returning user already has the data and the
 * blocking modal should be auto-marked complete.
 */
export const MODULE_SETUP_FIELDS: Record<ModuleSetupKey, (keyof HouseholdPreferences)[]> = {
  meals_setup: ["diet_type", "spice_level"],
  grocery_setup: ["pantry_size", "shopping_frequency"],
  finance_setup: ["monthly_grocery_budget", "budget_consciousness"],
  habits_setup: ["preferred_task_time"],
  calendar_setup: ["work_schedule"],
};

/**
 * Per-module typed boolean column on `household_preferences` that records
 * "the user has acknowledged this module's setup". When non-null, the gate
 * uses this column directly instead of the legacy `completed_module_setups`
 * jsonb merge — eliminating cache/race issues that re-prompted the modal.
 */
export const MODULE_SETUP_COLUMN: Record<ModuleSetupKey, keyof HouseholdPreferences | null> = {
  finance_setup: "finance_setup_complete",
  grocery_setup: "grocery_setup_complete",
  meals_setup: "meals_setup_complete",
  habits_setup: null,
  calendar_setup: null,
};

export const MODULE_SETUP_META: Record<ModuleSetupKey, { title: string; moduleName: string; description: string; icon: LucideIcon }> = {
  meals_setup: {
    title: "Quick setup for Meals",
    moduleName: "Meals",
    description: "Tell us about your diet so meal plans actually fit your family.",
    icon: UtensilsCrossed,
  },
  grocery_setup: {
    title: "Quick setup for Grocery",
    moduleName: "Grocery",
    description: "A few quick questions so we can size your shopping list correctly.",
    icon: ShoppingCart,
  },
  finance_setup: {
    title: "Quick setup for Finance",
    moduleName: "Finance",
    description: "Set your monthly grocery budget and how strict you'd like us to be.",
    icon: Wallet,
  },
  habits_setup: {
    title: "Quick setup for Habits",
    moduleName: "Habits",
    description: "When do you usually have time for habits?",
    icon: Leaf,
  },
  calendar_setup: {
    title: "Quick setup for Calendar",
    moduleName: "Calendar",
    description: "How is the household's work schedule set up?",
    icon: Calendar,
  },
};
