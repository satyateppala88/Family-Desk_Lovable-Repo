import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductSelectionStep } from "./ProductSelectionStep";

describe("ProductSelectionStep", () => {
  const mockToggle = vi.fn();

  it("renders all product options", () => {
    render(<ProductSelectionStep selectedProducts={[]} onProductToggle={mockToggle} />);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Meals")).toBeInTheDocument();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    expect(screen.getByText("Grocery")).toBeInTheDocument();
    expect(screen.getByText("Habits")).toBeInTheDocument();
  });

  it("renders the heading", () => {
    render(<ProductSelectionStep selectedProducts={[]} onProductToggle={mockToggle} />);
    expect(screen.getByText("Choose Your Features")).toBeInTheDocument();
  });

  it("shows warning when no products selected", () => {
    render(<ProductSelectionStep selectedProducts={[]} onProductToggle={mockToggle} />);
    expect(screen.getByText(/Please select at least one feature/)).toBeInTheDocument();
  });

  it("hides warning when products selected", () => {
    render(<ProductSelectionStep selectedProducts={["tasks"]} onProductToggle={mockToggle} />);
    expect(screen.queryByText(/Please select at least one feature/)).not.toBeInTheDocument();
  });

  it("shows descriptions for each product", () => {
    render(<ProductSelectionStep selectedProducts={[]} onProductToggle={mockToggle} />);
    expect(screen.getByText(/Manage and track household tasks/)).toBeInTheDocument();
    expect(screen.getByText(/AI-powered meal planning/)).toBeInTheDocument();
  });
});
