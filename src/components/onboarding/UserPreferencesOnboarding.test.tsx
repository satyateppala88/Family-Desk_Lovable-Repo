import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────

const navigateMock = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "qa@familydesk.in" } }),
}));

const householdMock = vi.fn(() => ({ householdId: "hh-1", isLoading: false }));
vi.mock("@/hooks/useHousehold", () => ({
  useHousehold: () => householdMock(),
}));

// ─── Supabase mock ──────────────────────────────────────────────────────
// Records every write so tests can assert exactly which tables got which rows.

type Call = { table: string; op: string; payload?: any; filter?: any; conflict?: any };
const calls: Call[] = [];
// Per-table preloaded SELECT responses (tests override per scenario).
let selectResponses: Record<string, any> = {};
// Per-op error to inject.
let injectedErrors: Record<string, any> = {};

const makeQuery = (table: string) => {
  const state: any = {
    table,
    _filters: {} as Record<string, unknown>,
    select(_cols?: string) { return state; },
    eq(col: string, val: unknown) { state._filters[col] = val; return state; },
    in(col: string, vals: unknown[]) { state._filters[col] = vals; return state; },
    upsert(payload: any, opts?: any) {
      calls.push({ table, op: "upsert", payload, conflict: opts?.onConflict });
      const err = injectedErrors[`${table}.upsert`] ?? null;
      const chain = { error: err };
      return Promise.resolve(chain);
    },
    update(payload: any) {
      calls.push({ table, op: "update", payload });
      const err = injectedErrors[`${table}.update`] ?? null;
      return {
        eq: (_c: string, _v: unknown) => Promise.resolve({ error: err }),
      };
    },
    delete() {
      const del = {
        _f: {} as Record<string, unknown>,
        eq(c: string, v: unknown) { this._f[c] = v; return this; },
        in(c: string, v: unknown[]) {
          this._f[c] = v;
          calls.push({ table, op: "delete", filter: this._f });
          return Promise.resolve({ error: injectedErrors[`${table}.delete`] ?? null });
        },
      };
      return del;
    },
    maybeSingle() {
      const data = selectResponses[table] ?? null;
      return Promise.resolve({ data, error: null });
    },
    // Awaiting the chain (e.g. `await supabase.from(t).select().eq(...)`)
    // resolves to the preloaded list response.
    then(resolve: any, reject?: any) {
      const data = selectResponses[`${table}:list`] ?? [];
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    },
  };
  return state;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => makeQuery(table),
  },
}));

// Lightweight stubs for child components — we test the host's persistence
// logic, not the children (which have their own tests).
vi.mock("./ProductSelectionStep", () => ({
  ProductSelectionStep: ({ selectedProducts, onProductToggle }: any) => (
    <div data-testid="product-step">
      {(["tasks", "meals", "calendar", "grocery", "habits", "finance"] as const).map((p) => (
        <button
          key={p}
          data-testid={`toggle-${p}`}
          aria-pressed={selectedProducts.includes(p)}
          onClick={() => onProductToggle(p)}
        >
          {p}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("./ModuleSetupQueue", () => ({
  ModuleSetupQueue: ({ products, onAllDone }: any) => (
    <div data-testid="setup-queue" data-products={products.join(",")}>
      <button data-testid="finish-queue" onClick={onAllDone}>finish queue</button>
    </div>
  ),
}));

// Import after mocks are registered
import { UserPreferencesOnboarding } from "./UserPreferencesOnboarding";

const renderHost = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UserPreferencesOnboarding />
    </QueryClientProvider>,
  );
};

const advanceToStep1 = () => {
  fireEvent.change(screen.getByPlaceholderText("e.g. Priya"), {
    target: { value: "Test User" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Next/i }));
};

beforeEach(() => {
  calls.length = 0;
  selectResponses = {};
  injectedErrors = {};
  navigateMock.mockReset();
  householdMock.mockReturnValue({ householdId: "hh-1", isLoading: false });
});

describe("UserPreferencesOnboarding — persistence", () => {
  it("writes profile, preferences, enabled products, household completion, and progress on Finish", async () => {
    renderHost();
    advanceToStep1();
    fireEvent.click(screen.getByTestId("toggle-finance")); // add finance to default 4
    fireEvent.click(screen.getByRole("button", { name: /Finish/i }));

    await waitFor(() => {
      expect(calls.find((c) => c.table === "households" && c.op === "update")).toBeTruthy();
    });

    expect(calls.find((c) => c.table === "profiles" && c.op === "update")?.payload).toEqual({
      display_name: "Test User",
    });
    const prefs = calls.find((c) => c.table === "household_preferences" && c.op === "upsert");
    expect(prefs?.payload.household_id).toBe("hh-1");
    expect(prefs?.conflict).toBe("household_id");

    const products = calls.find((c) => c.table === "household_enabled_products" && c.op === "upsert");
    expect(products?.payload.map((p: any) => p.product_name).sort()).toEqual(
      ["calendar", "finance", "grocery", "meals", "tasks"],
    );
    expect(products?.payload.every((p: any) => p.enabled_by === "user-1")).toBe(true);

    const hh = calls.find((c) => c.table === "households" && c.op === "update");
    expect(hh?.payload.onboarding_completed).toBe(true);

    const prog = calls.find((c) => c.table === "user_onboarding_progress" && c.op === "upsert");
    expect(prog?.payload.preferences_completed).toBe(true);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("DELETEs deselected modules for a returning user instead of leaving them stale", async () => {
    selectResponses["household_enabled_products:list"] = [
      { product_name: "tasks" },
      { product_name: "meals" },
      { product_name: "habits" },
    ];
    renderHost();
    advanceToStep1();
    // Wait for prefill effect to mark `habits` as currently enabled
    // (prefill runs as soon as householdId is available).
    await waitFor(() =>
      expect(screen.getByTestId("toggle-habits").getAttribute("aria-pressed")).toBe("true"),
    );
    // Deselect habits.
    fireEvent.click(screen.getByTestId("toggle-habits"));
    fireEvent.click(screen.getByRole("button", { name: /Finish/i }));

    await waitFor(() => {
      const del = calls.find(
        (c) => c.table === "household_enabled_products" && c.op === "delete",
      );
      expect(del).toBeTruthy();
      expect(del?.filter.product_name).toContain("habits");
    });
  });

  it("surfaces persistence errors via toast and does NOT navigate away", async () => {
    const { toast } = await import("sonner");
    injectedErrors["household_preferences.upsert"] = { message: "RLS denied" };

    renderHost();
    advanceToStep1();
    fireEvent.click(screen.getByRole("button", { name: /Finish/i }));

    await waitFor(() => {
      expect((toast.error as any)).toHaveBeenCalledWith(expect.stringContaining("RLS denied"));
    });
    expect(navigateMock).not.toHaveBeenCalledWith("/dashboard");
  });

  it("queues per-module setup for newly enabled modules instead of navigating immediately", async () => {
    // Returning user already had tasks; they add meals + finance now.
    selectResponses["household_enabled_products:list"] = [{ product_name: "tasks" }];
    renderHost();
    advanceToStep1();
    // Wait for prefill — tasks should be the only currently-pressed toggle.
    await waitFor(() =>
      expect(screen.getByTestId("toggle-tasks").getAttribute("aria-pressed")).toBe("true"),
    );
    // Prefill replaces the default selection with just [tasks].
    // Re-add the four newly-enabled modules the test expects in the queue.
    fireEvent.click(screen.getByTestId("toggle-meals"));
    fireEvent.click(screen.getByTestId("toggle-calendar"));
    fireEvent.click(screen.getByTestId("toggle-grocery"));
    fireEvent.click(screen.getByTestId("toggle-finance"));
    fireEvent.click(screen.getByRole("button", { name: /Finish/i }));

    const queue = await screen.findByTestId("setup-queue");
    const products = queue.getAttribute("data-products")!.split(",");
    expect(products).toEqual(expect.arrayContaining(["meals", "calendar", "grocery", "finance"]));
    expect(products).not.toContain("tasks"); // already enabled previously
    expect(navigateMock).not.toHaveBeenCalledWith("/dashboard");

    // Completing the queue navigates.
    fireEvent.click(screen.getByTestId("finish-queue"));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/dashboard"));
  });

  it("prefills basics from existing household_preferences (refresh resilience)", async () => {
    selectResponses["household_preferences"] = {
      family_size_adults: 3,
      family_size_children: 1,
      children_ages: [7],
      family_size_seniors: 2,
      household_type: "joint",
    };
    selectResponses["profiles"] = { display_name: "Returning User" };
    renderHost();

    await waitFor(() =>
      expect((screen.getByPlaceholderText("e.g. Priya") as HTMLInputElement).value).toBe(
        "Returning User",
      ),
    );
    // Adults input — second number input on step 0 is "Number of adults"
    const adultsInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    expect(adultsInput.value).toBe("3");
  });
});

afterEach(() => cleanup());

// vitest globals
import { afterEach } from "vitest";