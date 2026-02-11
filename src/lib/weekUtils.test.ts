import { describe, it, expect } from "vitest";
import {
  getWeekStartDate,
  getWeekEndDate,
  getWeekDays,
  getDayName,
  getShortDayName,
  formatWeekRange,
  getDayOfWeekNumber,
} from "./weekUtils";

describe("weekUtils", () => {
  // Use a known Wednesday: 2025-01-15
  const wednesday = new Date(2025, 0, 15);

  describe("getWeekStartDate", () => {
    it("returns Sunday for sunday start", () => {
      const start = getWeekStartDate(wednesday, "sunday");
      expect(start.getDay()).toBe(0); // Sunday
      expect(start.getDate()).toBe(12);
    });

    it("returns Monday for monday start", () => {
      const start = getWeekStartDate(wednesday, "monday");
      expect(start.getDay()).toBe(1); // Monday
      expect(start.getDate()).toBe(13);
    });
  });

  describe("getWeekEndDate", () => {
    it("returns Saturday for sunday start", () => {
      const end = getWeekEndDate(wednesday, "sunday");
      expect(end.getDay()).toBe(6);
    });

    it("returns Sunday for monday start", () => {
      const end = getWeekEndDate(wednesday, "monday");
      expect(end.getDay()).toBe(0);
    });
  });

  describe("getWeekDays", () => {
    it("returns 7 days", () => {
      const start = getWeekStartDate(wednesday, "monday");
      const days = getWeekDays(start);
      expect(days).toHaveLength(7);
    });

    it("returns consecutive dates", () => {
      const start = getWeekStartDate(wednesday, "monday");
      const days = getWeekDays(start);
      for (let i = 1; i < days.length; i++) {
        expect(days[i].getDate() - days[i - 1].getDate()).toBe(1);
      }
    });
  });

  describe("getDayName", () => {
    it("returns full day name", () => {
      expect(getDayName(wednesday)).toBe("Wednesday");
    });
  });

  describe("getShortDayName", () => {
    it("returns short day name", () => {
      expect(getShortDayName(wednesday)).toBe("Wed");
    });
  });

  describe("formatWeekRange", () => {
    it("formats range correctly", () => {
      const start = new Date(2025, 0, 13); // Mon Jan 13
      const result = formatWeekRange(start);
      expect(result).toBe("Jan 13 - Jan 19, 2025");
    });
  });

  describe("getDayOfWeekNumber", () => {
    it("returns 0 for first day of week", () => {
      const monday = new Date(2025, 0, 13);
      expect(getDayOfWeekNumber(monday, "monday")).toBe(0);
    });

    it("returns correct index for midweek day", () => {
      expect(getDayOfWeekNumber(wednesday, "monday")).toBe(2);
    });
  });
});
