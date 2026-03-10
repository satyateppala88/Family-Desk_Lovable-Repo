import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock all external dependencies
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(),
          })),
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));


vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Import after mocks
import Auth from "@/pages/Auth";

const renderAuth = () => {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>
  );
};

describe("Auth Page", () => {
  it("renders sign in and sign up tabs", () => {
    renderAuth();
    expect(screen.getByRole("tab", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sign up/i })).toBeInTheDocument();
  });

  it("renders the Family Desk title", () => {
    renderAuth();
    expect(screen.getByText("Family Desk")).toBeInTheDocument();
  });

  it("renders email and password inputs on sign in tab", () => {
    renderAuth();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders Sign In button", () => {
    renderAuth();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders dev mode login in dev environment", () => {
    renderAuth();
    // Dev mode card has "Login as Test User" button
    expect(screen.getByRole("button", { name: /login as test user/i })).toBeInTheDocument();
  });

  it("renders the app logo", () => {
    renderAuth();
    expect(screen.getByAltText("Family Desk Logo")).toBeInTheDocument();
  });
});
