import { describe, test, expect } from "bun:test";
import { preprocessTypstMath } from "./preprocessTypstMath";

describe("preprocessTypstMath", () => {
  describe("bare slash → frac()", () => {
    test("number / number", () => {
      expect(preprocessTypstMath("5/2")).toBe("frac(5,2)");
    });

    test("identifier / number", () => {
      expect(preprocessTypstMath("x/512")).toBe("frac(x,512)");
    });

    test("number / identifier", () => {
      expect(preprocessTypstMath("1/x")).toBe("frac(1,x)");
    });

    test("slash inside superscript parens", () => {
      expect(preprocessTypstMath("x^(1/2)")).toBe("x^(frac(1,2))");
    });

    test("multiple slashes in one expression", () => {
      expect(preprocessTypstMath("u = 5/2 plus.minus sqrt(25/4 - 4) = 5/2 plus.minus 3/2")).toBe(
        "u = frac(5,2) plus.minus sqrt(frac(25,4) - 4) = frac(5,2) plus.minus frac(3,2)"
      );
    });

    test("slash prefixed by fraction coefficient", () => {
      expect(preprocessTypstMath("1/3 x^2")).toBe("frac(1,3) x^2");
    });

    test("leaves existing frac() untouched", () => {
      expect(preprocessTypstMath("frac(a,b) dot frac(c,d)")).toBe("frac(a,b) dot frac(c,d)");
    });
  });

  describe("bare colon → ratio sign (∶)", () => {
    test("equation label E:", () => {
      expect(preprocessTypstMath("E: x_1 + x_2 = 3")).toBe("E∶ x_1 + x_2 = 3");
    });

    test("subscripted label E_1:", () => {
      expect(preprocessTypstMath("E_1: x_1 + x_2 + x_3 = 3")).toBe("E_1∶ x_1 + x_2 + x_3 = 3");
    });

    test("line label g:", () => {
      expect(preprocessTypstMath("g: arrow(x) = arrow(p) + t dot arrow(r)")).toBe(
        "g∶ arrow(x) = arrow(p) + t dot arrow(r)"
      );
    });

    test("colon as division operator between fractions", () => {
      expect(preprocessTypstMath("frac(a,b) : frac(c,d) = frac(a,b) dot frac(d,c)")).toBe(
        "frac(a,b) ∶ frac(c,d) = frac(a,b) dot frac(d,c)"
      );
    });
  });

  describe("combined", () => {
    test("slash and colon in same expression", () => {
      expect(preprocessTypstMath("E: x = 1/2")).toBe("E∶ x = frac(1,2)");
    });
  });

  describe("no-op cases", () => {
    test("plain expression without slash or colon", () => {
      const s = "(a + b)^2 = a^2 + 2 a b + b^2";
      expect(preprocessTypstMath(s)).toBe(s);
    });

    test("arrow functions are not affected", () => {
      const s = "arrow(a) dot arrow(b) = a_1 b_1 + a_2 b_2";
      expect(preprocessTypstMath(s)).toBe(s);
    });
  });
});
