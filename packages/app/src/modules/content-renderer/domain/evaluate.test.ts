import { describe, expect, test } from "bun:test";
import { char, typstToRow } from "@studyluma/catalog-contract";
import {
  bareFunction,
  callHead,
  evaluate,
  hasDecimal,
  parseRow,
  tryParse,
  unsimplified,
  unsupportedFunction,
  variablesIn,
} from "./evaluate";

const value = (typst: string, env: Record<string, number> = {}) =>
  evaluate(parseRow(typstToRow(typst)), env);

describe("functions: values (radians)", () => {
  test.each([
    ["sin(0)", 0],
    ["sin(pi/2)", 1],
    ["cos(0)", 1],
    ["cos(pi)", -1],
    ["sin(pi/6)", 0.5],
    ["ln(1)", 0],
    ["ln(e)", 1],
    ["ln(e^2)", 2],
    ["2 sin(pi/2)", 2],
    ["sin(pi/2) cos(0)", 1],
    ["1 - sin(pi/2)", 0],
  ])("%s = %d", (typst, expected) => {
    expect(value(typst)).toBeCloseTo(expected, 12);
  });

  test("the argument is any expression, with variables", () => {
    expect(value("sin(2x - pi)", { x: 0.3 })).toBeCloseTo(
      Math.sin(-Math.PI + 0.6),
    );
    expect(value("cos(pi x)", { x: 0.5 })).toBeCloseTo(0, 12);
    expect(value("ln(x)", { x: 4 })).toBeCloseTo(Math.log(4));
    expect(value("sin(cos(x))", { x: 1 })).toBeCloseTo(Math.sin(Math.cos(1)));
    expect(value("ln(x^2 + 1)", { x: 2 })).toBeCloseTo(Math.log(5));
  });

  test("a function binds to its brackets, not to what follows", () => {
    expect(value("sin(x)^2", { x: 1 })).toBeCloseTo(Math.sin(1) ** 2);
    expect(value("-sin(x)", { x: 1 })).toBeCloseTo(-Math.sin(1));
    expect(value("2x sin(x)", { x: 1 })).toBeCloseTo(2 * Math.sin(1));
    expect(value("sin(x)/2", { x: 1 })).toBeCloseTo(Math.sin(1) / 2);
  });

  test("a call is one unit as a numerator", () => {
    expect(value("sin(x)/2", { x: 1 })).toBeCloseTo(Math.sin(1) / 2);
    expect(value("sin^2(x)/2", { x: 1 })).toBeCloseTo(Math.sin(1) ** 2 / 2);
    expect(value("ln(x)/ln(2)", { x: 8 })).toBeCloseTo(3);
  });

  test("an exponent after the name applies to the value", () => {
    expect(value("sin^2(x)", { x: 1 })).toBeCloseTo(Math.sin(1) ** 2);
    expect(value("cos^2(x)", { x: 2 })).toBeCloseTo(Math.cos(2) ** 2);
    expect(value("sin^3(x)", { x: 2 })).toBeCloseTo(Math.sin(2) ** 3);
    expect(value("2 sin^2(x)", { x: 1 })).toBeCloseTo(2 * Math.sin(1) ** 2);
  });

  test("ln is not defined for zero and negatives", () => {
    expect(value("ln(x)", { x: -1 })).toBeNaN();
    expect(value("ln(x)", { x: 0 })).toBe(-Infinity);
  });

  test("an exponent box can also be typed as a power of the value", () => {
    const row = typstToRow("sin^2(x)");
    expect(parseRow(row)).toMatchObject({
      k: "pow",
      a: { k: "fn", name: "sin" },
    });
  });
});

describe("functions: letters that are not a call stay variables", () => {
  test("s, i and n before an ordinary bracket multiply", () => {
    // Only the letters of a function name directly before "(" are a call.
    expect(value("a(x)", { a: 3, x: 2 })).toBe(6);
    expect(value("x n", { x: 2, n: 5 })).toBe(10);
    expect(value("s i x", { s: 1, i: 2, x: 3 })).toBe(6);
  });

  test("letters before a name multiply with the call", () => {
    expect(value("a sin(x)", { a: 2, x: 1 })).toBeCloseTo(2 * Math.sin(1));
    expect(value("x ln(x)", { x: 2 })).toBeCloseTo(2 * Math.log(2));
  });

  test("a letter before sin still multiplies, also as asin(x)", () => {
    expect(value("asin(x)", { a: 2, x: 1 })).toBeCloseTo(2 * Math.sin(1));
  });
});

describe("functions: errors", () => {
  const entered = (typst: string) => typstToRow(typst);

  test.each(["sin x", "cos x", "ln x", "sin", "2 sin", "sin^2 x", "x sin y"])(
    "%s is a function without brackets",
    (typst) => {
      expect(tryParse(entered(typst))).toBeNull();
      expect(bareFunction(entered(typst))).not.toBeNull();
    },
  );

  test("the name is reported", () => {
    expect(bareFunction(entered("cos x"))).toBe("cos");
    expect(bareFunction(entered("2 ln x"))).toBe("ln");
    expect(bareFunction(entered("sin(x) cos x"))).toBe("cos");
  });

  test.each([
    "tan(x)",
    "arcsin(x)",
    "arccos(x)",
    "arctan(x)",
    "cot(x)",
    "log(x)",
    "exp(x)",
    "sinh(x)",
    "cosh(x)",
    "tanh(x)",
    "2 tan x",
    "x tan(x)",
  ])("%s is a function that does not exist here", (typst) => {
    expect(tryParse(entered(typst))).toBeNull();
    expect(bareFunction(entered(typst))).toBeNull();
    expect(unsupportedFunction(entered(typst))).not.toBeNull();
  });

  test("the missing function is reported by its whole name", () => {
    expect(unsupportedFunction(entered("tan(x)"))).toBe("tan");
    expect(unsupportedFunction(entered("arcsin(x)"))).toBe("arcsin");
    expect(unsupportedFunction(entered("2 x tanh(x)"))).toBe("tanh");
    expect(unsupportedFunction(entered("sin(x)"))).toBeNull();
    expect(unsupportedFunction(entered("sin x"))).toBeNull();
  });

  test("other failures are not about brackets", () => {
    expect(tryParse(entered("sin("))).toBeNull();
    expect(bareFunction(entered("sin("))).toBeNull();
    expect(bareFunction(entered("sin()"))).toBeNull();
    expect(bareFunction(entered("2 +"))).toBeNull();
  });

  test("an empty call and unbalanced brackets are incomplete", () => {
    const typed = (text: string) => [...text].map(char);
    expect(tryParse(typed("sin()"))).toBeNull();
    expect(tryParse(typed("sin(x"))).toBeNull();
    expect(tryParse(typed("sin(x))"))).toBeNull();
    expect(tryParse(typed("sin(x)"))).not.toBeNull();
  });

  test("an inverse function is not supported", () => {
    expect(tryParse(entered("sin^(-1)(x)"))).toBeNull();
    expect(bareFunction(entered("sin^(-1)(x)"))).toBeNull();
  });

  test("a valid call parses", () => {
    expect(tryParse(entered("sin(x)"))).not.toBeNull();
    expect(bareFunction(entered("sin(x)"))).toBeNull();
  });
});

describe("functions: helpers over the tree", () => {
  const ast = (typst: string) => parseRow(typstToRow(typst));

  test("variables are found next to digits and inside calls", () => {
    expect(variablesIn(ast("2x"))).toEqual(["x"]);
    expect(variablesIn(ast("2 cos(2x)"))).toEqual(["x"]);
    expect(variablesIn(ast("sin^2(x) + 1"))).toEqual(["x"]);
    expect(variablesIn(ast("a sin(b x)"))).toEqual(["a", "b", "x"]);
    expect(variablesIn(ast("2 e^x"))).toEqual(["x"]);
    expect(variablesIn(ast("sin(pi/6)"))).toEqual([]);
    expect(variablesIn(ast("ln(e)"))).toEqual([]);
  });

  test("decimals inside the argument count", () => {
    expect(hasDecimal(ast("sin(0.5)"))).toBe(true);
    expect(hasDecimal(ast("sin(x)"))).toBe(false);
  });

  test("arithmetic of plain numbers in the argument is unsimplified", () => {
    expect(unsimplified(ast("sin(2 * 3)"))).toBe(true);
    expect(unsimplified(ast("sin(pi/6)"))).toBe(false);
    expect(unsimplified(ast("sin(x)"))).toBe(false);
  });
});

describe("callHead: where a call's name starts", () => {
  const row = typstToRow("2 sin(x) + ln(x) + cos^2(x)");
  const opens = row.flatMap((node, i) =>
    node.t === "c" && node.v === "(" ? [i] : [],
  );

  test("finds name and start", () => {
    expect(opens.map((open) => callHead(row, open)?.name)).toEqual([
      "sin",
      "ln",
      "cos",
    ]);
    expect(callHead(row, opens[0] ?? -1)?.start).toBe(1);
  });

  test("an exponent between name and bracket belongs to the head", () => {
    const last = opens.at(-1) ?? -1;
    expect(callHead(row, last)?.start).toBe(last - 4);
  });

  test("an ordinary bracket has no head", () => {
    const plain = typstToRow("2(x + 1)");
    expect(callHead(plain, 1)).toBeNull();
    expect(callHead(typstToRow("s i(x)"), 3)).toBeNull();
  });
});
