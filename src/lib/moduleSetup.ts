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

export const MODULE_SETUP_KEYS: Record<ProductName, ModuleSetupKey> = {
  meals: "meals_setup",
  grocery: "grocery_setup",
  finance: "finance_setup",
  habits: "habits_setup",
  calendar: "calendar_setup",
  // Tasks shares the Routine setup with Habits — both consume
  // `preferred_task_time` and `household_concerns`, so we don't
  // re-prompt the user with the same questions twice.
  tasks: "habits_setup",
};

import type { HouseholdPreferences } from "@/types/database";
import type { FeatureName } from "@/hooks/useFeatureTour";

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

export const MODULE_SETUP_META: Record<ModuleSetupKey, { title: string; description: string }> = {
  meals_setup: {
    title: "Quick meal setup",
    description: "Tell us about your diet so meal plans actually fit your family.",
  },
  grocery_setup: {
    title: "Pantry & shopping setup",
    description: "A few quick questions so we can size your shopping list correctly.",
  },
  finance_setup: {
    title: "Budget setup",
    description: "Set your monthly grocery budget and how strict you'd like us to be.",
  },
  habits_setup: {
    title: "Routine setup",
    description: "When do you usually have time for habits?",
  },
  calendar_setup: {
    title: "Calendar setup",
    description: "How is the household's work schedule set up?",
  },
};

/**
 * Maps a module setup to its corresponding welcome-tour feature name.
 * The setup gate uses this to defer showing the setup dialog until the
 * tour for that feature has been completed/dismissed — preventing the
 * tour modal and setup modal from stacking on top of each other.
 * Modules without a tour (e.g. finance) are simply omitted.
 */
export const MODULE_TO_FEATURE_TOUR: Partial<Record<ModuleSetupKey, FeatureName>> = {
  meals_setup: "meals",
  grocery_setup: "grocery",
  habits_setup: "habits",
  calendar_setup: "calendar",
};
