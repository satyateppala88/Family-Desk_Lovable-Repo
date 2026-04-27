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
import { ModuleSetupDialog, clearModuleSetupDraft } from "./ModuleSetupGate";

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

  // ───────────────────────────────────────────────────────────────────────
  // Draft persistence (in-progress answers across close / module switch)
  // ───────────────────────────────────────────────────────────────────────

  it("persists in-progress answers to localStorage and restores them on remount", () => {
    // First mount: pick a non-default option for the first radio.
    const { unmount } = render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );
    const veganRadio = screen.getByLabelText("vegan");
    fireEvent.click(veganRadio);
    expect((veganRadio as HTMLInputElement).getAttribute("aria-checked")).toBe("true");

    // Close the dialog (simulate user dismissing without saving).
    unmount();

    // Re-mount: the previously chosen option should be restored from draft.
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    const veganAgain = screen.getByLabelText("vegan");
    expect(veganAgain.getAttribute("aria-checked")).toBe("true");

    // Cleanup so other tests don't see this draft.
    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("keeps drafts isolated per module (switching module does not leak answers)", () => {
    // Make a meals selection.
    const { unmount } = render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );
    fireEvent.click(screen.getByLabelText("vegan"));
    unmount();

    // Switch to a different module — meals draft must NOT affect it.
    render(<ModuleSetupDialog module="grocery_setup" open={true} dismissible={true} />);
    // Grocery's "small" radio should be at its default state (not "small"
    // unless the user picks it). The default is "medium" per the form code.
    const medium = screen.getByLabelText("medium");
    expect(medium.getAttribute("aria-checked")).toBe("true");

    clearModuleSetupDraft("hh-1", "meals_setup");
    clearModuleSetupDraft("hh-1", "grocery_setup");
  });

  it("clears the draft after a successful save", async () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <ModuleSetupDialog
        module="finance_setup"
        open={true}
        dismissible={true}
        onComplete={onComplete}
      />,
    );
    // Make a non-default selection.
    fireEvent.click(screen.getByLabelText("Under 5,000"));
    // Trigger save.
    const footer = getFooter();
    fireEvent.click(within(footer).getByRole("button", { name: "Save & continue" }));
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
    unmount();

    // Re-mount: the chosen option should NOT be restored (draft was cleared
    // on successful save). Default is "5000_to_10000".
    render(<ModuleSetupDialog module="finance_setup" open={true} dismissible={true} />);
    const underFive = screen.getByLabelText("Under 5,000");
    expect(underFive.getAttribute("aria-checked")).toBe("false");
    const defaultRange = screen.getByLabelText("5,000 – 10,000");
    expect(defaultRange.getAttribute("aria-checked")).toBe("true");
  });

  it("persists progress count and % across unmount/remount", () => {
    // Fresh dialog: progress should start at 0/5 (defaults are not counted
    // as answered until the user actually touches them).
    const { unmount } = render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );
    const initialBar = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(initialBar.getAttribute("aria-valuenow")).toBe("0");
    expect(initialBar.textContent).toContain("Answered 0 of 5");

    // Touch two questions.
    fireEvent.click(screen.getByLabelText("vegan"));
    fireEvent.click(screen.getByLabelText("spicy"));

    const afterBar = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(afterBar.getAttribute("aria-valuenow")).toBe("40"); // 2/5 = 40%
    expect(afterBar.textContent).toContain("Answered 2 of 5");

    // Simulate refresh / reopen by unmounting and remounting.
    unmount();
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);

    const restoredBar = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(restoredBar.getAttribute("aria-valuenow")).toBe("40");
    expect(restoredBar.textContent).toContain("Answered 2 of 5");

    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("clears persisted progress after a successful save", async () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <ModuleSetupDialog
        module="finance_setup"
        open={true}
        dismissible={true}
        onComplete={onComplete}
      />,
    );
    fireEvent.click(screen.getByLabelText("Under 5,000"));
    const bar = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(bar.getAttribute("aria-valuenow")).toBe("50"); // 1/2

    const footer = getFooter();
    fireEvent.click(within(footer).getByRole("button", { name: "Save & continue" }));
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalled());
    unmount();

    render(<ModuleSetupDialog module="finance_setup" open={true} dismissible={true} />);
    const freshBar = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(freshBar.getAttribute("aria-valuenow")).toBe("0");
    expect(freshBar.textContent).toContain("Answered 0 of 2");
  });
});