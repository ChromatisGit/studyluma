import { describe, expect, test } from "bun:test";
import { snapToStep } from "./sliders";

describe("snapToStep", () => {
  test("float noise around 0 becomes 0", () => {
    expect(snapToStep(-2e-16, 0, 10, 1)).toBe(0);
    const step = Math.PI / 12;
    expect(
      snapToStep(12 * step - 12 * step + 1e-17, 0, 2 * Math.PI, step),
    ).toBe(0);
    expect(Object.is(snapToStep(-0, 0, 1, 0.5), -0)).toBe(false);
  });

  test("a value moves to the nearest step", () => {
    expect(snapToStep(0.74, 0, 2, 0.5)).toBe(0.5);
    expect(snapToStep(0.76, 0, 2, 0.5)).toBe(1);
    expect(snapToStep(2.7, 1, 4, 1)).toBe(3);
  });

  test("steps like 0.1 come out clean", () => {
    expect(snapToStep(0.1 + 0.2, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(0.7000000000000001, 0, 1, 0.1)).toBe(0.7);
  });

  test("multiples of π keep their value", () => {
    const step = Math.PI / 12;
    expect(snapToStep(5 * step, 0, 2 * Math.PI, step)).toBeCloseTo(
      (5 * Math.PI) / 12,
      8,
    );
    expect(snapToStep(2 * Math.PI, 0, 2 * Math.PI, step)).toBeLessThanOrEqual(
      2 * Math.PI,
    );
  });

  test("the result stays inside the range", () => {
    expect(snapToStep(9, 0, 2, 0.5)).toBe(2);
    expect(snapToStep(-3, 0, 2, 0.5)).toBe(0);
  });

  test("a bad step leaves the value alone", () => {
    expect(snapToStep(1.234, 0, 2, 0)).toBe(1.234);
  });
});
