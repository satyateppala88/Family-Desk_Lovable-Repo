import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/useHousehold", () => ({ useHousehold: () => ({ householdId: "hh-1", isLoading: false }) }));
vi.mock("@/hooks/useHouseholdPreferences", () => ({
  useHouseholdPreferences: () => ({ preferences: {}, updatePreferences: async () => {}, isUpdating: false }),
}));
vi.mock("@/hooks/useModuleSetup", () => ({
  useModuleSetup: () => ({ needsSetup: true, markComplete: async () => {}, isMarking: false }),
}));
import { ModuleSetupDialog } from "@/components/onboarding/ModuleSetupGate";

describe("min", () => {
  it("renders", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    expect(screen.getByText("Diet type")).toBeInTheDocument();
  });
});
