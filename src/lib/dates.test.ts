import { describe, expect, test } from "vitest";

import {
  addDays,
  addMonths,
  customRange,
  daysBetween,
  eachDay,
  isInRange,
  isLocalDate,
  monthRange,
  quarterRange,
  toLocalDate,
  monthGrid,
  msUntilNextDay,
  today,
  weekdayOf,
  weekRange,
} from "./dates";

describe("dates", () => {
  test("a local date uses the local calendar day, not UTC", () => {
    expect(toLocalDate(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
    expect(toLocalDate(new Date(2026, 0, 2, 0, 1))).toBe("2026-01-02");
    expect(today(new Date(2026, 10, 2, 9))).toBe("2026-11-02");
  });

  test("month grids start on the chosen weekday", () => {
    // November 2026 starts on a Sunday.
    expect(monthGrid(2026, 11, 1).leadingBlanks).toBe(6);
    expect(monthGrid(2026, 11, 0).leadingBlanks).toBe(0);
    const november = monthGrid(2026, 11, 1).days;
    expect(november).toHaveLength(30);
    expect(november[0]).toBe("2026-11-01");
    expect(november.at(-1)).toBe("2026-11-30");
    expect(monthGrid(2028, 2).days).toHaveLength(29);
    expect(monthGrid(2026, 2).days).toHaveLength(28);
  });

  test("milliseconds until the next local midnight", () => {
    expect(msUntilNextDay(new Date(2026, 10, 2, 23, 59, 30))).toBe(30_000);
    expect(msUntilNextDay(new Date(2026, 10, 2, 0, 0, 0))).toBe(86_400_000);
  });

  test("validation rejects impossible dates", () => {
    expect(isLocalDate("2026-02-28")).toBe(true);
    expect(isLocalDate("2026-02-29")).toBe(false);
    expect(isLocalDate("2028-02-29")).toBe(true);
    expect(isLocalDate("2026-13-01")).toBe(false);
    expect(isLocalDate("2026-1-01")).toBe(false);
  });

  test("adding days crosses months, years and daylight saving changes", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // Clocks change in late March and late October in Europe, early March and November in the US.
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysBetween("2026-11-02", "2026-11-01")).toBe(-1);
  });

  test("adding months clamps to the end of a shorter month", () => {
    expect(addMonths("2026-08-31", -6)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
  });

  test("weekdays: 0 is Sunday", () => {
    expect(weekdayOf("2026-11-01")).toBe(0);
    expect(weekdayOf("2026-11-06")).toBe(5);
  });

  test("weeks start on Monday or Sunday", () => {
    // 2026-11-04 is a Wednesday.
    expect(weekRange("2026-11-04", 1)).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(weekRange("2026-11-04", 0)).toEqual({ start: "2026-11-01", end: "2026-11-07" });
    // A Sunday belongs to the week before when weeks start on Monday.
    expect(weekRange("2026-11-08", 1)).toEqual({ start: "2026-11-02", end: "2026-11-08" });
    expect(weekRange("2026-11-08", 0)).toEqual({ start: "2026-11-08", end: "2026-11-14" });
    // A week can span two years.
    expect(weekRange("2027-01-01", 1)).toEqual({ start: "2026-12-28", end: "2027-01-03" });
  });

  test("months and quarters", () => {
    expect(monthRange("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(quarterRange("2026-11-02")).toEqual({ start: "2026-10-01", end: "2026-12-31" });
    expect(quarterRange("2026-01-01")).toEqual({ start: "2026-01-01", end: "2026-03-31" });
    expect(quarterRange("2026-06-30")).toEqual({ start: "2026-04-01", end: "2026-06-30" });
  });

  test("custom ranges accept either order", () => {
    expect(customRange("2026-11-10", "2026-11-02")).toEqual({
      start: "2026-11-02",
      end: "2026-11-10",
    });
    const range = customRange("2026-11-02", "2026-11-04");
    expect(eachDay(range)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
    expect(isInRange("2026-11-04", range)).toBe(true);
    expect(isInRange("2026-11-05", range)).toBe(false);
  });
});
