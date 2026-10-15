import { describe, expect, test } from "bun:test";
import {
  clockStartFor,
  lessonStart,
  nearestPeriod,
  startChoices,
  type Period,
} from "./clock";

const at = (time: string) => new Date(`2026-10-05T${time}`);

// 45-minute periods, 5 minutes break: starts are 50 minutes apart.
const periods: Period[] = [
  { number: 1, start: 8 * 60, end: 8 * 60 + 45 },
  { number: 2, start: 8 * 60 + 50, end: 9 * 60 + 35 },
  { number: 3, start: 9 * 60 + 40, end: 10 * 60 + 25 },
];

describe("nearestPeriod", () => {
  const number = (time: string) => nearestPeriod(at(time), periods)?.number;

  test("before the first period it is the first", () => {
    expect(number("06:30:00")).toBe(1);
    expect(number("07:59:00")).toBe(1);
  });

  test("shortly after a start it is that period", () => {
    expect(number("08:05:00")).toBe(1);
    expect(number("08:20:00")).toBe(1);
  });

  test("the switch lies midway between two starts", () => {
    expect(number("08:24:59")).toBe(1);
    expect(number("08:25:00")).toBe(2);
    expect(number("08:30:00")).toBe(2);
  });

  test("in a break it is the next period", () => {
    expect(number("08:47:00")).toBe(2);
    expect(number("08:55:00")).toBe(2);
  });

  test("the last period stays until its end", () => {
    expect(number("10:00:00")).toBe(3);
    expect(number("10:24:00")).toBe(3);
  });

  test("after the last period there is none", () => {
    expect(number("10:25:00")).toBeUndefined();
    expect(number("18:00:00")).toBeUndefined();
  });

  test("without a timetable there is none", () => {
    expect(nearestPeriod(at("09:00:00"), [])).toBeNull();
  });
});

describe("lessonStart", () => {
  test("before the first period it counts down to its start", () => {
    const start = lessonStart(at("07:50:00"), periods);
    expect(start.periodNumber).toBe(1);
    expect(start.startsAt).toBe(at("08:00:00").getTime());
  });

  test("shortly after a start it counts from that start", () => {
    const start = lessonStart(at("08:56:00"), periods);
    expect(start).toEqual({
      periodNumber: 2,
      startsAt: at("08:50:00").getTime(),
    });
  });

  test("outside the timetable it counts from now", () => {
    const now = at("18:00:00");
    expect(lessonStart(now, periods)).toEqual({
      periodNumber: null,
      startsAt: now.getTime(),
    });
  });

  test("without a timetable it always counts from now", () => {
    const now = at("09:00:00");
    expect(lessonStart(now, []).periodNumber).toBeNull();
  });
});

describe("clockStartFor", () => {
  test("a corrected period starts at its beginning", () => {
    const start = clockStartFor(at("09:00:00"), periods[0] ?? null);
    expect(start.startsAt).toBe(at("08:00:00").getTime());
  });

  test("null means from now", () => {
    const now = at("09:00:00");
    expect(clockStartFor(now, null).startsAt).toBe(now.getTime());
  });
});

describe("startChoices", () => {
  const numbers = (chosen: number | null) =>
    startChoices(periods, chosen).map((period) => period?.number ?? null);

  test("offers the period before, the chosen one and from now", () => {
    expect(numbers(2)).toEqual([1, 2, null]);
  });

  test("the first period has nothing before it", () => {
    expect(numbers(1)).toEqual([1, null]);
  });

  test("from now offers the last two periods", () => {
    expect(numbers(null)).toEqual([2, 3, null]);
  });
});
