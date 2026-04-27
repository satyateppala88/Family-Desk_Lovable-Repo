import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/useHousehold", () => ({
  useHousehold: () => ({ householdId: "hh-1", isLoading: false }),
}));

const updatePreferencesMock = vi.fn(async (_u: unknown) => {});
vi.mock("@/hooks/useHouseholdPreferences", () => ({
  useHouseholdPreferences: () => ({
    preferences: {},
    updatePreferences: updatePreferencesMock,
    isUpdating: false,
  }),
}));

const markCompleteMock = vi.fn(async () => {});
vi.mock("@/hooks/useModuleSetup", () => ({
  useModuleSetup: () => ({
    needsSetup: true,
    markComplete: markCompleteMock,
    isMarking: false,
  }),
}));

// Import AFTER mocks so they're picked up.
import { ModuleSetupDialog } from "./ModuleSetupGate";

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Find the dialog's scrollable form container (the one with overflow-y-auto). */
const getScrollContainer = (): HTMLElement => {
  // The dialog renders into a portal under document.body.
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("div"));
  const el = candidates.find((d) => d.className.includes("overflow-y-auto"));
  if (!el) throw new Error("Scroll container not found");
  return el;
};

/** Find the DialogFooter element (rendered with the dialog's footer class). */
const getFooter = (): HTMLElement => {
  // shadcn DialogFooter renders with class "flex-row justify-between" added.
  const buttons = screen.getAllByRole("button");
  const skip = buttons.find((b) => b.textContent === "Skip for now");
  if (!skip) throw new Error("Skip button not found");
  // Walk up to the footer wrapper (the sibling of the scroll container).
  let el: HTMLElement | null = skip;
  while (el && !el.className.includes("border-t")) el = el.parentElement;
  if (!el) throw new Error("Footer wrapper not found");
  return el;
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe("ModuleSetupDialog — scroll & footer layout", () => {
  beforeEach(() => {
    cleanup();
    updatePreferencesMock.mockClear();
    markCompleteMock.mockClear();
  });

  it("renders the form body inside an overflow-y-auto scroll container", () => {
    render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );

    const scroll = getScrollContainer();
    expect(scroll.className).toMatch(/overflow-y-auto/);
    // It uses flex-1 + min-h-0 so it actually fills the dialog and scrolls.
    expect(scroll.className).toMatch(/flex-1/);
    expect(scroll.className).toMatch(/min-h-0/);

    // Every Meals question label lives inside the scroll container.
    const questionLabels = [
      "Diet type",
      "Spice level",
      "Weekday cooking time",
      "Food allergies",
      "Favourite regional cuisines",
    ];
    for (const label of questionLabels) {
      const el = within(scroll).getByText(label);
      expect(el).toBeInTheDocument();
    }
  });

  it("renders the footer OUTSIDE the scroll container so it cannot block options", () => {
    render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );

    const scroll = getScrollContainer();
    const footer = getFooter();

    // The footer must not be a descendant of the scroll container — that
    // is the structural guarantee that scrolled questions can never be
    // visually overlapped or pushed under the footer.
    expect(scroll.contains(footer)).toBe(false);

    // Footer and scroll container must share a common ancestor (DialogContent)
    // and the footer must come AFTER the scroll container in document order
    // so it sits at the bottom of the dialog.
    const pos = scroll.compareDocumentPosition(footer);
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Footer renders both action buttons.
    within(footer).getByRole("button", { name: "Skip for now" });
    within(footer).getByRole("button", { name: "Save & continue" });
  });

  it("Save & continue button (outside scroll) still triggers the form's save flow", async () => {
    const onComplete = vi.fn();
    render(
      <ModuleSetupDialog
        module="finance_setup"
        open={true}
        dismissible={true}
        onComplete={onComplete}
      />,
    );

    const footer = getFooter();
    const saveBtn = within(footer).getByRole("button", { name: "Save & continue" });
    fireEvent.click(saveBtn);

    // The form's onSubmit (registered via FormActionContext) must be invoked,
    // which calls updatePreferences and then markComplete.
    await vi.waitFor(() => expect(updatePreferencesMock).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(markCompleteMock).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it("Skip for now button (outside scroll) advances without saving", async () => {
    const onSkip = vi.fn();
    render(
      <ModuleSetupDialog
        module="grocery_setup"
        open={true}
        dismissible={true}
        onSkip={onSkip}
      />,
    );

    const footer = getFooter();
    fireEvent.click(within(footer).getByRole("button", { name: "Skip for now" }));

    await vi.waitFor(() => expect(onSkip).toHaveBeenCalledTimes(1));
    // Skip does NOT save preferences when dismissible.
    expect(updatePreferencesMock).not.toHaveBeenCalled();
    // And does NOT mark complete when dismissible (so the gate can re-prompt).
    expect(markCompleteMock).not.toHaveBeenCalled();
  });

  it("renders a progress indicator with role=progressbar above the scroll area", () => {
    render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );

    const bar = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(bar).toBeInTheDocument();
    // Progress bar must NOT be inside the scroll container — it stays
    // visible while the user scrolls.
    const scroll = getScrollContainer();
    expect(scroll.contains(bar)).toBe(false);
    // It must come BEFORE the scroll container in document order.
    const pos = bar.compareDocumentPosition(scroll);
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});