import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn (class name utility)", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges tailwind conflicts correctly", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });

  it("handles array input via clsx", () => {
    expect(cn(["a", "b"])).toBe("a b");
  });
});
