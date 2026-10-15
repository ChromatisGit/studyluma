import { describe, expect, test } from "bun:test";
import {
  germanDecimals,
  prepareTypstMath,
  splitOperation,
} from "../src/prepareTypstMath";

describe("prepareTypstMath", () => {
  test.each([
    ["5/2", "frac(5, 2)"],
    ["x/512", "frac(x, 512)"],
    ["1/x", "frac(1, x)"],
    ["x^(1/2)", "x^(frac(1, 2))"],
    ["1/3 x^2", "frac(1, 3) x^2"],
    ["-1/2500 x^4 + 1/100 x^3", "-frac(1, 2500) x^4 + frac(1, 100) x^3"],
    ["(a + b)/(c + d)", "frac(a + b, c + d)"],
    ["x^(n-1)/2", "frac(x^(n-1), 2)"],
    ["sqrt(2)/2", "frac(sqrt(2), 2)"],
    ["(p/2)^2 - q", "(frac(p, 2))^2 - q"],
    ["sqrt(25/4 - 4)", "sqrt(frac(25, 4) - 4)"],
    ["a / b / c", "frac(frac(a, b), c)"],
    ["f'(x)/2", "frac(f'(x), 2)"],
    ["3 pi/4", "3 frac(pi, 4)"],
  ])("%s", (source, expected) => {
    expect(prepareTypstMath(source)).toBe(expected);
  });

  test("leaves frac() and plain expressions untouched", () => {
    expect(prepareTypstMath("frac(a,b) + frac(c,d)")).toBe(
      "frac(a,b) + frac(c,d)",
    );
    const plain = "(a + b)^2 = a^2 + 2 a b + b^2";
    expect(prepareTypstMath(plain)).toBe(plain);
  });

  test("colon becomes the ratio sign", () => {
    expect(prepareTypstMath("E_1: x = 1/2")).toBe("E_1∶ x = frac(1, 2)");
  });

  test("asterisk becomes the operator dot, but not inside text", () => {
    expect(prepareTypstMath("a * b")).toBe("a dot.op b");
    expect(prepareTypstMath('"x*y" * 2')).toBe('"x*y" dot.op 2');
  });

  test.each([
    ["0,5 x + 2 = x + 1,5", "0.5 x + 2 = x + 1.5"],
    ["x = 12,25", "x = 12.25"],
    ["(0,5 x + 1) * 2", "(0.5 x + 1) dot.op 2"],
    ["1,5/2", "frac(1.5, 2)"],
  ])("decimal comma: %s", (source, expected) => {
    expect(prepareTypstMath(source)).toBe(expected);
  });

  test("a comma stays where it separates", () => {
    expect(prepareTypstMath("f(1,2)")).toBe("f(1,2)");
    expect(prepareTypstMath("vec(1,2)")).toBe("vec(1,2)");
    expect(prepareTypstMath("{1,5}")).toBe("{1,5}");
    expect(prepareTypstMath("f(x, 0,5)")).toBe("f(x, 0,5)");
    expect(prepareTypstMath("1,2,3")).toBe("1,2,3");
    expect(prepareTypstMath('"1,5" + x, y')).toBe('"1,5" + x, y');
  });
});

describe("splitOperation", () => {
  test("splits a transformation at its only bar", () => {
    expect(splitOperation("5x = 2x + 6 | -2x")).toEqual({
      equation: "5x = 2x + 6",
      operation: "-2x",
    });
  });

  test("an odd number of bars splits at the last", () => {
    expect(splitOperation("|x + 3| = 5 | -5")).toEqual({
      equation: "|x + 3| = 5",
      operation: "-5",
    });
  });

  test("an even number of bars is part of the formula", () => {
    expect(splitOperation("|x + 3| = 5")).toBeNull();
    expect(splitOperation("x = 5")).toBeNull();
  });

  test("bars in text, mapsto and empty sides do not count", () => {
    expect(splitOperation('"a|b" = x | -1')?.operation).toBe("-1");
    expect(splitOperation("x |-> x^2")).toBeNull();
    expect(splitOperation("x = 5 |")).toBeNull();
    expect(splitOperation("| -2x")).toBeNull();
  });

  test("a bar inside brackets belongs to the formula", () => {
    expect(splitOperation("P(2 | 5)")).toBeNull();
    expect(splitOperation("L = {x in RR | x > 2}")).toBeNull();
    expect(splitOperation("(x + 1) = 2 | -1")?.operation).toBe("-1");
  });
});

describe("germanDecimals", () => {
  test("turns decimal points in numbers into commas", () => {
    expect(germanDecimals("<mn>7.5</mn><mi>x.y</mi><mn>3</mn>")).toBe(
      "<mn>7,5</mn><mi>x.y</mi><mn>3</mn>",
    );
  });
});
