import { describe, expect, test } from "bun:test";
import {
  formatPi,
  gridStep,
  labelStride,
  labelWidth,
  multipleOf,
  multipleOfPi,
  piLabel,
  piText,
  piTicks,
  spokenPi,
} from "./piMultiples";

const PI = Math.PI;

describe("axis labels", () => {
  test("pi/2 over [-7, 7] gives the multiples of π/2 without 0", () => {
    const ticks = piTicks([-7, 7], "pi/2");
    expect(ticks.map((t) => t.k)).toEqual([-4, -3, -2, -1, 1, 2, 3, 4]);
    expect(ticks.map((t) => piText(multipleOf(t.k, "pi/2")))).toEqual([
      "−2π",
      "−3π/2",
      "−π",
      "−π/2",
      "π/2",
      "π",
      "3π/2",
      "2π",
    ]);
    expect(ticks[0]?.x).toBeCloseTo(-2 * PI, 12);
  });

  test("fractions are stacked, whole multiples are not", () => {
    expect(piLabel(multipleOf(3, "pi/2"))).toEqual({ top: "3π", bottom: "2" });
    expect(piLabel(multipleOf(-1, "pi/2"))).toEqual({ top: "−π", bottom: "2" });
    expect(piLabel(multipleOf(2, "pi/2"))).toEqual({ top: "π" });
    expect(piLabel(multipleOf(-4, "pi/2"))).toEqual({ top: "−2π" });
  });

  test("pi/4 reduces its fractions", () => {
    const labels = piTicks([0, 2 * PI], "pi/4").map((t) =>
      piText(multipleOf(t.k, "pi/4")),
    );
    expect(labels).toEqual([
      "π/4",
      "π/2",
      "3π/4",
      "π",
      "5π/4",
      "3π/2",
      "7π/4",
      "2π",
    ]);
  });

  test("pi has one label per π", () => {
    expect(
      piTicks([-7, 7], "pi").map((t) => piText(multipleOf(t.k, "pi"))),
    ).toEqual(["−2π", "−π", "π", "2π"]);
  });

  test("a range edge exactly on a grid line keeps that label", () => {
    expect(piTicks([0, 2 * PI], "pi").map((t) => t.k)).toEqual([1, 2]);
    expect(piTicks([-PI, PI], "pi").map((t) => t.k)).toEqual([-1, 1]);
  });

  test("the grid step", () => {
    expect(gridStep("pi/4")).toBeCloseTo(PI / 4, 12);
  });
});

describe("label stride", () => {
  const widest = labelWidth({ top: "−3π", bottom: "2" }, 14);

  test("all labels fit on a wide plot", () => {
    expect(labelStride(60, widest, 6)).toBe(1);
  });

  test("every second label when neighbours would touch", () => {
    expect(labelStride(30, widest, 6)).toBe(2);
  });

  test("keeps halving on a very narrow plot", () => {
    expect(labelStride(10, widest, 6)).toBe(4);
    expect(labelStride(0.001, widest, 6)).toBe(64);
  });

  test("375px: the labels of π/2 over [-7, 7] fit without hiding any", () => {
    const stepPx = (340 / 14) * (PI / 2);
    expect(labelStride(stepPx, widest, 6)).toBe(1);
  });
});

describe("slider values", () => {
  test.each([
    [0, "0"],
    [PI, "π"],
    [-PI, "−π"],
    [PI / 4, "π/4"],
    [(3 * PI) / 4, "3π/4"],
    [2 * PI, "2π"],
    [-(3 * PI) / 2, "−3π/2"],
    [PI / 12, "π/12"],
    [(11 * PI) / 12, "11π/12"],
    [(6 * PI) / 12, "π/2"],
    [5 * (PI / 12), "5π/12"],
  ])("%d is shown as %s", (value, text) => {
    expect(formatPi(value)).toBe(text);
  });

  test("steps of a browser slider (accumulated) still read as fractions", () => {
    const step = PI / 12;
    expect(formatPi(0 + 7 * step)).toBe("7π/12");
    expect(formatPi(step + step + step + 6 * step)).toBe("3π/4");
  });

  test("other values fall back to a rounded coefficient", () => {
    expect(formatPi(1)).toBe("0,318π");
    expect(formatPi(-1)).toBe("−0,318π");
    expect(formatPi(PI / 13)).toBe("0,077π");
    expect(formatPi(0.0001)).toBe("0");
  });

  test("multipleOfPi finds the smallest denominator", () => {
    expect(multipleOfPi(PI / 2)).toEqual({ numerator: 1, denominator: 2 });
    expect(multipleOfPi((2 * PI) / 4)).toEqual({
      numerator: 1,
      denominator: 2,
    });
    expect(multipleOfPi(PI / 13)).toBeUndefined();
    expect(multipleOfPi(0)).toEqual({ numerator: 0, denominator: 1 });
  });

  test("the spoken form separates the coefficient from π", () => {
    expect(spokenPi(0, "durch")).toBe("0");
    expect(spokenPi(PI, "durch")).toBe("π");
    expect(spokenPi(-PI, "durch")).toBe("−π");
    expect(spokenPi(2 * PI, "durch")).toBe("2 π");
    expect(spokenPi((3 * PI) / 4, "durch")).toBe("3 π durch 4");
    expect(spokenPi(-PI / 2, "durch")).toBe("−π durch 2");
    expect(spokenPi(PI / 12, "durch")).toBe("π durch 12");
    expect(spokenPi(1, "durch")).toBe("0,318 π");
  });

  test("the spoken form says what the text shows", () => {
    for (const k of [1, 5, 7, 11]) {
      const value = (k * PI) / 12;
      const written = formatPi(value);
      const spoken = spokenPi(value, "durch");
      expect(written).toBe(k === 1 ? "π/12" : `${k}π/12`);
      expect(spoken).toBe(k === 1 ? "π durch 12" : `${k} π durch 12`);
    }
  });
});
