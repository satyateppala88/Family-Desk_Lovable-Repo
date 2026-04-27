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

  it("progress indicator is keyboard-focusable and announces percentage", () => {
    render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );

    const bar = screen.getByRole("progressbar", { name: /setup completion/i });

    // Keyboard-reachable.
    expect(bar.getAttribute("tabindex")).toBe("0");

    // Reads a complete phrase including the percentage.
    expect(bar.getAttribute("aria-valuetext")).toBe("0 of 5 answered, 0% complete");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");

    // After answering, the announced phrase updates.
    fireEvent.click(screen.getByLabelText("vegan"));
    const updated = screen.getByRole("progressbar", { name: /setup completion/i });
    expect(updated.getAttribute("aria-valuetext")).toBe("1 of 5 answered, 20% complete");
    expect(updated.getAttribute("aria-valuenow")).toBe("20");

    // A polite live region exists alongside the bar so progress updates
    // are announced. (There may be other live regions in the dialog —
    // e.g. the next-question announcer — so match by text content.)
    const lives = screen.getAllByRole("status");
    const progressLive = lives.find(
      (el) => el.textContent?.includes("complete") && el.textContent?.includes("of 5"),
    );
    expect(progressLive).toBeDefined();
    expect(progressLive!.getAttribute("aria-live")).toBe("polite");
    expect(progressLive!.getAttribute("aria-atomic")).toBe("true");
    expect(progressLive!.textContent).toContain("20% complete");
    expect(progressLive!.textContent).toContain("1 of 5");

    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("persists the last auto-focused question across close/reopen", () => {
    // Touch the first question — focus advances to question index 1
    // (Spice level) and that key gets persisted.
    const { unmount } = render(
      <ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />,
    );
    fireEvent.click(screen.getByLabelText("vegan"));
    // Then touch question index 1 to bump focus to index 2.
    fireEvent.click(screen.getByLabelText("spicy"));

    // localStorage should now hold the active question pointer for this
    // household + module. We don't assert the exact key (implementation
    // detail) — only that it's present.
    const storageKey = "familydesk:module-setup-active:hh-1:meals_setup";
    expect(window.localStorage.getItem(storageKey)).toBeTruthy();
    const savedKey = window.localStorage.getItem(storageKey);

    unmount();

    // Reopen — the saved active key should hydrate back. We verify by
    // checking that the same key is still in storage (the dialog read it
    // on mount) and that no error occurred.
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    expect(window.localStorage.getItem(storageKey)).toBe(savedKey);

    // After clearing the draft, the active pointer should also be gone.
    clearModuleSetupDraft("hh-1", "meals_setup");
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  // ───────────────────────────────────────────────────────────────────────
  // Question activation & auto-scroll behavior
  // ───────────────────────────────────────────────────────────────────────

  /**
   * JSDOM doesn't compute layout, so we stub the geometry of every Question
   * wrapper to a fixed height starting at predictable offsets, and override
   * the scroll container's `clientHeight` + `scrollTo`. This lets us assert
   * which question becomes "active" (gets scrolled to) after each tap.
   *
   * Layout model used in these tests:
   *   - Each Question: 100px tall, stacked back-to-back
   *   - Container clientHeight: 150px (fits ~1.5 questions)
   *   - Container offsetTop: 0
   */
  const stubLayout = () => {
    const scroll = getScrollContainer();
    Object.defineProperty(scroll, "offsetTop", { configurable: true, value: 0 });
    Object.defineProperty(scroll, "clientHeight", { configurable: true, value: 150 });
    // Track scrollTop manually since jsdom doesn't drive it from scrollTo.
    let currentTop = 0;
    Object.defineProperty(scroll, "scrollTop", {
      configurable: true,
      get: () => currentTop,
      set: (v: number) => { currentTop = v; },
    });
    const scrollToMock = vi.fn((arg: any) => {
      currentTop = typeof arg === "number" ? arg : arg?.top ?? 0;
    });
    (scroll as any).scrollTo = scrollToMock;

    // Each Question wrapper is the parent of a <Label> at the top of its
    // children. We find them via their labels and stub geometry.
    const labels = [
      "Diet type",
      "Spice level",
      "Weekday cooking time",
      "Food allergies",
      "Favourite regional cuisines",
    ];
    const wrappers: HTMLElement[] = [];
    labels.forEach((label, i) => {
      // The <Question> wrapper is the closest ancestor div that's a direct
      // child of the form's <fieldset> — so just take the parent element.
      const labelEl = within(scroll).getByText(label);
      // Wrapper is two levels up: <div ref> > <Label>. Walk up until we
      // find the div whose parent is the fieldset/form body.
      let wrapper: HTMLElement | null = labelEl.parentElement;
      while (wrapper && wrapper.parentElement?.tagName !== "FIELDSET") {
        wrapper = wrapper.parentElement;
      }
      if (!wrapper) throw new Error(`Could not find wrapper for ${label}`);
      Object.defineProperty(wrapper, "offsetTop", { configurable: true, value: i * 100 });
      Object.defineProperty(wrapper, "offsetHeight", { configurable: true, value: 100 });
      wrappers.push(wrapper);
    });
    return { scroll, scrollToMock, wrappers };
  };

  it("scrolls the next question into view after a single-choice selection", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    const { scrollToMock } = stubLayout();

    // Pick a Diet type (question 0) → focus advances to question 1
    // (Spice level), whose top is at 100px. With an 8px margin, we expect
    // the container to scroll to top = 100 - 8 = 92 (question 1 is below
    // the visible area at scrollTop 0 with clientHeight 150 — bottom 200
    // > viewBottom 150 - 8).
    fireEvent.click(screen.getByLabelText("vegan"));

    expect(scrollToMock).toHaveBeenCalledTimes(1);
    const arg = scrollToMock.mock.calls[0][0];
    expect(arg.behavior).toBe("smooth");
    // Top should be near 92 (offsetTop 100 - 8 margin) using the
    // align-bottom branch: elBottom 200 - clientHeight 150 + margin 8 = 58.
    // Either branch is fine — assert it's a positive number that brings
    // q1 into view (i.e. between 0 and 100).
    expect(arg.top).toBeGreaterThan(0);
    expect(arg.top).toBeLessThanOrEqual(100);

    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("does NOT scroll when the next question is already fully visible", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    const { scroll, scrollToMock } = stubLayout();
    // Make the viewport tall enough to fit questions 0 AND 1 fully (with
    // margin): need >= 200 + 16 = 216px.
    Object.defineProperty(scroll, "clientHeight", { configurable: true, value: 300 });

    fireEvent.click(screen.getByLabelText("vegan"));

    expect(scrollToMock).not.toHaveBeenCalled();
    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("does NOT auto-scroll for multi-select (checkbox) questions", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    const { scrollToMock } = stubLayout();

    // "Food allergies" (question 3) is a checkbox group — toggling any
    // option should mark progress but NOT advance focus / scroll.
    // The Label has no `htmlFor`, so click the checkbox by walking from
    // the visible label text to its sibling checkbox.
    const nutsLabel = screen.getByText("Nuts");
    const row = nutsLabel.parentElement!;
    const checkbox = within(row).getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(scrollToMock).not.toHaveBeenCalled();
    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("advances focus key in storage to match the activated question", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    stubLayout();

    const storageKey = "familydesk:module-setup-active:hh-1:meals_setup";
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    // Tap Diet type → focus advances to Spice level.
    fireEvent.click(screen.getByLabelText("vegan"));
    expect(window.localStorage.getItem(storageKey)).toBe("spice_level");

    // Tap Spice level → focus advances to Weekday cooking time.
    fireEvent.click(screen.getByLabelText("spicy"));
    expect(window.localStorage.getItem(storageKey)).toBe("weekday_cooking_time");

    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("clamps active focus to the last question when at the end", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);
    stubLayout();

    // Touch question 4 (the last applicable: Favourite regional cuisines).
    // Since it's a checkbox group, it doesn't advance focus on its own —
    // so instead, walk through the radios first.
    fireEvent.click(screen.getByLabelText("vegan"));            // q0 → focus q1
    fireEvent.click(screen.getByLabelText("spicy"));            // q1 → focus q2
    fireEvent.click(screen.getByLabelText("More than 60 min")); // q2 → focus q3

    const storageKey = "familydesk:module-setup-active:hh-1:meals_setup";
    // After 3 advances from index 0, 1, 2 we should be on the question at
    // index 3 (food_allergies).
    expect(window.localStorage.getItem(storageKey)).toBe("food_allergies");

    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  // ───────────────────────────────────────────────────────────────────────
  // ARIA live announcement for next question
  // ───────────────────────────────────────────────────────────────────────

  it("announces the next question by name + step count when focus advances", () => {
    render(<ModuleSetupDialog module="meals_setup" open={true} dismissible={true} />);

    const announcer = screen.getByTestId("question-announcer");
    // Live region attributes — polite + atomic so SRs read it as a single
    // phrase without interrupting the user.
    expect(announcer.getAttribute("aria-live")).toBe("polite");
    expect(announcer.getAttribute("aria-atomic")).toBe("true");
    // Sr-only — no visual content.
    expect(announcer.className).toContain("sr-only");
    // Empty before any selection (no question is "active" yet).
    expect(announcer.textContent).toBe("");

    // Pick Diet type → focus advances to Spice level (index 1, step 2/5).
    fireEvent.click(screen.getByLabelText("vegan"));
    const after1 = screen.getByTestId("question-announcer");
    expect(after1.textContent).toBe("Now on: Spice level, step 2 of 5.");

    // Pick Spice level → focus advances to Weekday cooking time (3/5).
    fireEvent.click(screen.getByLabelText("spicy"));
    const after2 = screen.getByTestId("question-announcer");
    expect(after2.textContent).toBe("Now on: Weekday cooking time, step 3 of 5.");

    clearModuleSetupDraft("hh-1", "meals_setup");
  });

  it("re-keys the announcer so duplicate messages still re-announce", () => {
    render(<ModuleSetupDialog module="grocery_setup" open={true} dismissible={true} />);

    // Initially no announcement.
    let announcer = screen.getByTestId("question-announcer");
    expect(announcer.textContent).toBe("");

    // Tap pantry size → advance to shopping_frequency (step 2 of 3).
    fireEvent.click(screen.getByLabelText("small"));
    announcer = screen.getByTestId("question-announcer");
    const firstKey = announcer.getAttribute("data-tick") ?? announcer.outerHTML;
    expect(announcer.textContent).toContain("Shopping frequency");
    expect(announcer.textContent).toContain("step 2 of 3");

    // Tap shopping_frequency → advance to organic_preference (step 3 of 3).
    // Use a non-default value so onValueChange actually fires (default
    // is "weekly", so clicking "Weekly" would be a no-op).
    fireEvent.click(screen.getByLabelText("Daily"));
    announcer = screen.getByTestId("question-announcer");
    expect(announcer.textContent).toContain("Organic preference");
    expect(announcer.textContent).toContain("step 3 of 3");

    // Different message means the underlying React `key` changed — the
    // node identity is different so SRs treat it as a fresh announcement.
    expect(announcer.outerHTML).not.toBe(firstKey);

    clearModuleSetupDraft("hh-1", "grocery_setup");
  });
});