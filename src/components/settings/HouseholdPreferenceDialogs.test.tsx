import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HouseholdPreferences } from "@/types/database";
import { EditBudgetPreferencesDialog } from "./EditBudgetPreferencesDialog";
import { EditHouseholdBasicsDialog } from "./EditHouseholdBasicsDialog";

const basePreferences = {
  id: "prefs-1",
  household_id: "hh-1",
  family_size_adults: 2,
  family_size_children: 0,
  household_type: "nuclear",
  diet_type: "vegetarian",
  food_allergies: [],
  religious_restrictions: "none",
  spice_level: "medium",
  regional_cuisines: [],
  cooking_skill_level: "intermediate",
  weekday_cooking_time: "30_to_60",
  preferred_meal_types: [],
  pantry_size: "medium",
  shopping_frequency: "weekly",
  household_concerns: [],
  work_schedule: "both_working",
  preferred_task_time: "evening",
  festival_importance: "somewhat",
  monthly_grocery_budget: "5000_to_10000",
  shopping_locations: [],
  organic_preference: "always",
  budget_consciousness: "somewhat",
  week_start_day: "monday",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} satisfies HouseholdPreferences;

describe("household preference dialogs", () => {
  it("rehydrates household basics from the latest saved preferences when reopened", () => {
    const onSave = vi.fn(async (_updates: Partial<HouseholdPreferences>) => {});
    const { rerender } = render(
      <EditHouseholdBasicsDialog preferences={basePreferences} onSave={onSave} />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(2);
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    rerender(
      <EditHouseholdBasicsDialog
        preferences={{ ...basePreferences, family_size_adults: 4, family_size_children: 2, household_type: "joint" }}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(4);
    expect(screen.getAllByRole("spinbutton")[1]).toHaveValue(2);
    expect(screen.getByLabelText(/joint family/i)).toHaveAttribute("aria-checked", "true");
  });

  it("saves only finance-owned fields so other module values are preserved", () => {
    const onSave = vi.fn(async () => {});
    render(<EditBudgetPreferencesDialog preferences={basePreferences} onSave={onSave} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByLabelText(/above ₹20,000/i));
    fireEvent.click(screen.getByLabelText(/very conscious/i));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledWith({
      monthly_grocery_budget: "above_20000",
      budget_consciousness: "very_conscious",
    });
    const payload = onSave.mock.calls[0][0];
    expect(payload).not.toHaveProperty("organic_preference");
    expect(payload).not.toHaveProperty("pantry_size");
  });

  it("opens finance edits with saved values instead of defaults", () => {
    render(
      <EditBudgetPreferencesDialog
        preferences={{ ...basePreferences, monthly_grocery_budget: "under_5000", budget_consciousness: "not_much" }}
        onSave={vi.fn(async () => {})}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText(/under ₹5,000/i)).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByLabelText(/not much/i)).toHaveAttribute("aria-checked", "true");
  });
});

afterEach(() => cleanup());