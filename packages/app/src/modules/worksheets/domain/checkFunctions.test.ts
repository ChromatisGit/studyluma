import { describe, expect, test } from "bun:test";
import { gap, part } from "../../../test/catalog";
import { compiled, m, row, term } from "../../../test/check";
import { checkMath, checkPart, mathAnswerOf } from "./check";
import type { CheckState, MathAnswer } from "./contract";

const check = (entered: string, answer: MathAnswer) =>
  checkMath(row(entered), answer, m);
const summary = (entered: string, answer: MathAnswer) => {
  const own = check(entered, answer);
  return own
    ? [own.state, own.message ?? own.note ?? ""].join(" ").trim()
    : null;
};

describe("sin, cos, ln: terms", () => {
  test.each([
    ["2 sin(x)", "2 sin(x)", "richtig"],
    ["sin(x)", "sin(x) · 1", "richtig"],
    ["sin(2x - pi)", "-sin(2x)", "richtig"],
    ["cos(pi x)", "cos(x pi)", "richtig"],
    ["cos(x)", "sin(x + pi/2)", "richtig"],
    ["sin(x)", "cos(x)", "nochNicht"],
    ["sin(x)", "sin(2x)", "nochNicht"],
    ["sin(x)", "x", "nochNicht"],
    ["sin^2(x)", "sin(x)^2", "richtig"],
    ["sin^2(x)", "1 - cos^2(x)", "richtig"],
    ["cos^2(x)", "frac(1 + cos(2x), 2)", "richtig"],
    ["sin^2(x)", "sin(x)", "nochNicht"],
    ["sin(x)/2", "frac(sin(x), 2)", "richtig"],
  ])("%s entered as %s → %s", (expected, entered, state) => {
    expect(summary(entered, term(expected))).toBe(state);
  });

  test("ln is compared only where it is defined", () => {
    expect(summary("ln(x)", term("ln(x)"))).toBe("richtig");
    expect(summary("ln(x^2)", term("2 ln(x)"))).toBe("richtig");
    expect(summary("ln(x) + ln(2)", term("ln(2x)"))).toBe("richtig");
    expect(summary("ln(x)", term("ln(2x)"))).toBe("nochNicht");
    // Undefined on the whole sample range of -3…3 up to 5.
    expect(summary("ln(x - 5)", term("ln(x - 5)"))).toBe("richtig");
    expect(summary("ln(x - 5)", term("x"))).toBe("nochNicht");
  });

  test("a term never defined at any point is not right", () => {
    expect(summary("x", term("ln(-1 - x^2)"))).toBe("nochNicht");
  });

  test("a parameter works inside the argument", () => {
    const answer = term("sin(a x)", ["a", "x"]);
    expect(summary("sin(a x)", answer)).toBe("richtig");
    expect(summary("sin(x a)", answer)).toBe("richtig");
    expect(summary("sin(a)", answer)).toBe("nochNicht");
  });

  test("arithmetic between plain numbers in the argument is simplified", () => {
    expect(summary("sin(2 · 3 x)", term("sin(6x)"))).toBe("fast simplify");
  });
});

describe("sin, cos, ln: numbers", () => {
  test("an exact trig value: fraction, decimal and the call itself", () => {
    const answer: MathAnswer = { kind: "number", exact: "sin(pi/6)" };
    expect(summary("sin(pi/6)", answer)).toBe("richtig");
    expect(summary("0.5", answer)).toBe("richtig");
    expect(summary("frac(1, 2)", answer)).toBe("richtig");
    // The "/" inside the call is not a fraction answer.
    expect(summary("0.5", answer)).not.toContain("fraction");
    expect(summary("0.6", answer)).toBe("nochNicht");
  });

  test("a rounded value hints at the exact form without taking the call for π", () => {
    const answer: MathAnswer = { kind: "number", exact: "sqrt(3)/2" };
    expect(summary("cos(pi/6)", answer)).toBe("richtig");
    expect(summary("0.87", answer)).toBe("fast exact:root");
    const call: MathAnswer = { kind: "number", exact: "2 sin(pi/3)" };
    // 2 sin(π/3) = √3 ≈ 1.732: no π and no fraction outside the call.
    expect(summary("1.73", call)).toBe("fast rounding");
    expect(summary("sqrt(3)", call)).toBe("richtig");
  });

  test("rounded answers with trig values", () => {
    const answer: MathAnswer = {
      kind: "number",
      exact: "sin(1)",
      rounded: { value: "0.84", places: 2 },
    };
    expect(summary("0.84", answer)).toBe("richtig");
    expect(summary("0.8415", answer)).toBe("richtig");
    expect(summary("sin(1)", answer)).toBe("richtig");
    expect(summary("0.8", answer)).toBe("fast places:2");
    expect(summary("0.85", answer)).toBe("fast rounding");
    expect(summary("0.9", answer)).toBe("nochNicht");
  });

  test("a rounded answer without an exact value", () => {
    const answer: MathAnswer = {
      kind: "number",
      rounded: { value: "0.69", places: 2 },
    };
    expect(summary("0.69", answer)).toBe("richtig");
    expect(summary("ln(2)", answer)).toBe("fast rounding");
  });

  test("ln of a non-positive number is wrong, not an error", () => {
    const answer: MathAnswer = { kind: "number", exact: "0" };
    expect(summary("ln(0)", answer)).toBe("nochNicht");
    expect(summary("ln(-1)", answer)).toBe("nochNicht");
    expect(summary("ln(1)", answer)).toBe("richtig");
  });
});

describe("sin, cos, ln: solution sets with π", () => {
  const answer: MathAnswer = {
    kind: "set",
    elements: [
      { kind: "number", exact: "pi/6" },
      { kind: "number", exact: "5 pi/6" },
    ],
  };
  const set = (typst: string) =>
    checkMath({ row: row(typst) }, answer, m)?.state;
  test("pi/6; 5pi/6 in any order", () => {
    expect(set("frac(π, 6); frac(5π, 6)")).toBe("richtig");
    expect(set("frac(5π, 6); frac(π, 6)")).toBe("richtig");
    expect(set("frac(π, 6)")).toBe("fast");
    expect(set("frac(π, 3); frac(5π, 6)")).toBe("nochNicht");
  });
  test("a trig value as element of a set", () => {
    const roots: MathAnswer = {
      kind: "set",
      elements: [
        { kind: "number", exact: "sin(pi/6)" },
        { kind: "number", exact: "cos(pi/3)" },
      ],
    };
    expect(checkMath({ row: row("0.5; frac(1, 2)") }, roots, m)?.state).toBe(
      "richtig",
    );
  });
});

describe("sin, cos, ln: bracket hint", () => {
  test("a function name without brackets says where to put them", () => {
    for (const [entered, name] of [
      ["sin x", "sin"],
      ["2 cos x", "cos"],
      ["ln x + 1", "ln"],
    ] as const) {
      const own = check(entered, term("sin(x)"));
      expect(own?.state).toBe("nochNicht");
      expect(own?.message).toBe(`brackets:${name}`);
      expect(check(entered, { kind: "number", exact: "1" })?.message).toBe(
        `brackets:${name}`,
      );
    }
  });
  test("a function that does not exist says so, also for other names", () => {
    for (const name of ["tan", "arcsin", "log", "exp", "tanh", "cot"]) {
      const own = check(`${name}(x)`, term("sin(x)"));
      expect(own?.state).toBe("nochNicht");
      expect(own?.message).toBe(`missing:${name}`);
    }
  });
  test("other unfinished entries keep the general message", () => {
    expect(check("sin()", term("sin(x)"))?.message).toBe("incomplete");
    expect(check("sin^(-1)(x)", term("sin(x)"))?.message).toBe("incomplete");
  });
});

describe("sin, cos, ln: gaps and answers", () => {
  test("a gap with cos follows the term rules", () => {
    const einsetzen = part("p", "Einsetzen", {
      content: [
        {
          type: "paragraph",
          children: [gap("g0", "cos(pi x)", { math: true })],
        },
      ],
    });
    expect(checkPart(einsetzen, { g0: row("cos(x pi)") }, m)?.state).toBe(
      "richtig",
    );
    expect(checkPart(einsetzen, { g0: row("sin(pi x)") }, m)?.state).toBe(
      "nochNicht",
    );
    expect(checkPart(einsetzen, { g0: row("cos x") }, m)?.message).toBe(
      "brackets:cos",
    );
    expect(checkPart(einsetzen, { g0: row("tan(x)") }, m)?.message).toBe(
      "missing:tan",
    );
  });

  test("the function hint of a gap wins over the free-gap count", () => {
    const einsetzen = part("p", "Einsetzen", {
      content: [
        {
          type: "paragraph",
          children: [
            gap("g0", "cos(x)", { math: true }),
            gap("g1", "1", { math: true }),
          ],
        },
      ],
    });
    expect(checkPart(einsetzen, { g0: row("cos(x)") }, m)?.message).toBe(
      "free:1",
    );
    expect(checkPart(einsetzen, { g0: row("cos x") }, m)?.message).toBe(
      "brackets:cos",
    );
  });

  test("the compiled answer with a function and one variable is a term", () => {
    const own = mathAnswerOf({
      exact: "2 sin(x)",
      checkRow: row("2 sin(x)"),
    });
    expect(own).toMatchObject({ kind: "term", variables: ["x"] });
    expect(
      mathAnswerOf({ exact: "sin(pi/6)", checkRow: row("sin(pi/6)") }).kind,
    ).toBe("number");
  });

  test("::fehler works with a term that has a function", () => {
    const antwort = part("p", "Antwort", {
      answer: { exact: "cos(x)", checkRow: row("cos(x)") },
      markers: { fehler: [{ answer: "-sin(x)", feedback: "Ableitung!" }] },
    });
    expect(checkPart(antwort, row("cos(x)"), m)?.state).toBe("richtig");
    expect(checkPart(antwort, row("-sin(x)"), m)?.message).toBe("Ableitung!");
  });
});

describe("sin, cos, ln: Graph", () => {
  const graph = part("graph", "Graph", {
    answers: [
      { exact: "sin(x)", checkRow: row("sin(x)") },
      { exact: "2 ln(x)", checkRow: row("2 ln(x)") },
    ],
  });
  const enter = (...terms: string[]) =>
    Object.fromEntries(terms.map((term, i) => [String(i), row(term)]));

  test("equivalent writings are correct", () => {
    const own = checkPart(graph, enter("-sin(-x)", "ln(x^2)"), m);
    expect(own?.state).toBe("richtig");
  });
  test("a wrong function is marked on its field", () => {
    const own = checkPart(graph, enter("sin(x)", "ln(x)"), m);
    expect(own?.items).toEqual({ "0": "richtig", "1": "nochNicht" });
  });
  test("a function without brackets gives the hint", () => {
    const own = checkPart(graph, enter("sin x", "2 ln(x)"), m);
    expect(own?.state).toBe("nochNicht");
    expect(own?.message).toBe("brackets:sin");
    expect(own?.items).toEqual({ "0": "nochNicht", "1": "richtig" });
  });
});

describe("compiled answers: term or number", () => {
  test.each([
    ["2x", ["x"]],
    ["2 x", ["x"]],
    ["2cos(2x)", ["x"]],
    ["2 cos(2x)", ["x"]],
    ["cos(x)", ["x"]],
    ["sin^2(x) + 1", ["x"]],
    ["3x^2 - 12", ["x"]],
    ["a sin(b x)", ["a", "b", "x"]],
  ])("%s is a term in %j", (written, variables) => {
    expect(mathAnswerOf(compiled(written))).toMatchObject({
      kind: "term",
      variables,
    });
  });

  test.each(["1/2", "sin(pi/6)", "ln(e)", "2 sqrt(3)", "sin(1)"])(
    "%s is a number",
    (written) => {
      expect(mathAnswerOf(compiled(written)).kind).toBe("number");
    },
  );

  test("without a prepared row the written form is read the same way", () => {
    expect(mathAnswerOf({ exact: "2cos(2x)" }).kind).toBe("term");
    expect(mathAnswerOf({ exact: "4 x^3" }).kind).toBe("term");
    expect(mathAnswerOf({ exact: "sin(pi/6)" }).kind).toBe("number");
  });
});

describe("Verkettung: the compiled task of the ui-test sheet", () => {
  const verkettung = part("p", "Antwort", {
    answer: compiled("2 cos(2x)"),
    markers: {
      fehler: [
        { answer: "cos(2x)", feedback: "Vergiss die innere Ableitung!" },
      ],
    },
  });
  const entry = (typst: string) => checkPart(verkettung, row(typst), m);

  test("the right answer in any writing is richtig", () => {
    for (const typst of ["2cos(2x)", "2 cos(2x)", "cos(2x) * 2", "2cos(x*2)"]) {
      expect(entry(typst)?.state).toBe("richtig");
    }
  });
  test("a wrong answer is not", () => {
    expect(entry("2cos(x)")?.state).toBe("nochNicht");
    expect(entry("cos(2x)")?.state).toBe("nochNicht");
    expect(entry("2sin(2x)")?.state).toBe("nochNicht");
  });
  test("the ::fehler hit gives its question", () => {
    expect(entry("cos(2x)")?.message).toBe("Vergiss die innere Ableitung!");
    expect(entry("cos(2 x)")?.message).toBe("Vergiss die innere Ableitung!");
    expect(entry("2cos(x)")?.message).toBeUndefined();
  });
});

describe("terms with functions next to digits", () => {
  const rows = (written: string): MathAnswer => mathAnswerOf(compiled(written));
  test.each([
    ["cos(x)", "cos(x)", "richtig"],
    ["2x", "2x", "richtig"],
    ["2x", "x * 2", "richtig"],
    ["2x", "3x", "nochNicht"],
    ["sin^2(x) + 1", "1 + sin^2(x)", "richtig"],
    ["sin^2(x) + 1", "1 + sin(x)", "nochNicht"],
    ["2cos(2x)", "2cos(2x)", "richtig"],
  ])("%s accepts %s as %s", (written, entered, state) => {
    expect(check(entered, rows(written))?.state).toBe(state as CheckState);
  });
});

describe("an expected answer that cannot be read never throws", () => {
  const term = (expected: string): MathAnswer => ({
    kind: "term",
    expected,
    variables: ["x"],
  });
  test("sin^(-1)(x) as the expected term", () => {
    expect(check("x", term("sin^(-1)(x)"))?.state).toBe("nochNicht");
    expect(check("sin(x)", term("sin^(-1)(x)"))?.state).toBe("nochNicht");
  });
  test("as a number, in a set and in a rounded answer", () => {
    const number: MathAnswer = { kind: "number", exact: "sin^(-1)(1)" };
    expect(check("1", number)?.state).toBe("nochNicht");
    const set: MathAnswer = { kind: "set", elements: [number] };
    expect(checkMath({ row: row("1") }, set, m)?.state).toBe("nochNicht");
    const rounded: MathAnswer = {
      kind: "number",
      exact: "sin^(-1)(1)",
      rounded: { value: "1.57", places: 2 },
    };
    expect(check("1.57", rounded)?.state).toBe("nochNicht");
  });
  test("an unreadable ::fehler answer is skipped", () => {
    const antwort = part("p", "Antwort", {
      answer: compiled("2x"),
      markers: {
        fehler: [
          { answer: "sin^(-1)(x)", feedback: "unreadable" },
          { answer: "x", feedback: "half" },
        ],
      },
    });
    expect(checkPart(antwort, row("3x"), m)?.message).toBeUndefined();
    expect(checkPart(antwort, row("x"), m)?.message).toBe("half");
  });
  test("an answer from the compiled bundle with an unparseable row", () => {
    const answer = mathAnswerOf({ exact: "x_0", checkRow: row("(x_0)") });
    expect(check("x", answer)?.state).toBe("nochNicht");
  });
});
