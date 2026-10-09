import { describe, expect, test } from "bun:test";
import { prepareTypstMath } from "./typstMath";

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
    expect(prepareTypstMath("frac(a,b) dot.op frac(c,d)")).toBe(
      "frac(a,b) dot.op frac(c,d)",
    );
    const plain = "(a + b)^2 = a^2 + 2 a b + b^2";
    expect(prepareTypstMath(plain)).toBe(plain);
  });

  test("colon becomes the ratio sign", () => {
    expect(prepareTypstMath("E_1: x = 1/2")).toBe("E_1∶ x = frac(1, 2)");
  });

  test("dot becomes the operator dot", () => {
    expect(prepareTypstMath("a dot b")).toBe("a dot.op b");
  });
});
