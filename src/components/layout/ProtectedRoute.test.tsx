import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// Mock the auth context
const mockAuth = {
  user: null as any,
  session: null,
  loading: false,
  isEmailVerified: false,
  signOut: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));

const renderWithRouter = (ui: React.ReactElement, path = "/dashboard") => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {ui}
    </MemoryRouter>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    mockAuth.user = null;
    mockAuth.loading = false;
    mockAuth.isEmailVerified = false;
  });

  it("shows loading skeleton when loading", () => {
    mockAuth.loading = true;
    renderWithRouter(
      <ProtectedRoute><div>Protected</div></ProtectedRoute>
    );
    // Should not show children while loading
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("redirects to /auth when no user", () => {
    const { container } = renderWithRouter(
      <ProtectedRoute><div>Protected</div></ProtectedRoute>
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("redirects unverified users to /auth", () => {
    mockAuth.user = { id: "123", email: "test@test.com" };
    mockAuth.isEmailVerified = false;
    renderWithRouter(
      <ProtectedRoute><div>Protected</div></ProtectedRoute>
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("renders children when authenticated and verified", () => {
    mockAuth.user = { id: "123", email: "test@test.com" };
    mockAuth.isEmailVerified = true;
    renderWithRouter(
      <ProtectedRoute><div>Protected</div></ProtectedRoute>
    );
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});
