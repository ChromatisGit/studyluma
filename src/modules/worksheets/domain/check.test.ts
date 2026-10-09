import { describe, expect, test } from "bun:test";
import { gap, part } from "../../../test/catalog";
import {
  checkGaps,
  checkMath,
  checkPart,
  mathAnswerOf,
  optionId,
  type CheckMessages,
} from "./check";
import type { MathAnswer } from "./contract";
import { gapsOf } from "../../content-renderer";
import { typstToRow } from "./typst";

const m: CheckMessages = {
  simplify: "simplify",
  preferFraction: "fraction",
  exact: (form) => `exact:${form}`,
  places: (n) => `places:${n}`,
  rounding: "rounding",
  incomplete: "incomplete",
  missingSolution: "missing",
  freeGaps: (n) => `free:${n}`,
  inCell: (cell, message) => `${cell.row}/${cell.column}: ${message}`,
};

const row = (typst: string) => typstToRow(typst);
const check = (entered: string, answer: MathAnswer) =>
  checkMath(row(entered), answer, m);
const summary = (entered: string, answer: MathAnswer) => {
  const own = check(entered, answer);
  return own
    ? [own.state, own.message ?? own.note ?? ""].join(" ").trim()
    : null;
};

describe("numbers: exact 3 pi (spec table)", () => {
  const answer: MathAnswer = { kind: "number", exact: "3 pi" };
  test.each([
    ["3π", "richtig"],
    ["π · 3", "richtig"],
    ["frac(6 π, 2)", "fast simplify"],
    ["9.42", "fast exact:pi"],
    ["9.4248", "fast exact:pi"],
    ["10", "nochNicht"],
  ])("%s → %s", (entered, expected) => {
    expect(summary(entered, answer)).toBe(expected);
  });
});

describe("numbers: 1/3 ≈ 0.33 (spec table)", () => {
  const answer: MathAnswer = {
    kind: "number",
    exact: "1/3",
    rounded: { value: "0.33", places: 2 },
  };
  test.each([
    ["0.33", "richtig"],
    ["0.333", "richtig"],
    ["frac(1, 3)", "richtig"],
    ["0.3", "fast places:2"],
    ["0.34", "fast rounding"],
    ["0.4", "nochNicht"],
  ])("%s → %s", (entered, expected) => {
    expect(summary(entered, answer)).toBe(expected);
  });
});

describe("numbers: other rules", () => {
  test("16.9 for 17 is a rounding error, not right", () => {
    expect(summary("16.9", { kind: "number", exact: "17" })).toBe(
      "fast rounding",
    );
  });
  test("a decimal equal to a fraction answer is right with a note", () => {
    expect(summary("0.25", { kind: "number", exact: "1/4" })).toBe(
      "richtig fraction",
    );
  });
  test("arithmetic between plain numbers must be simplified", () => {
    expect(summary("3 · 4", { kind: "number", exact: "12" })).toBe(
      "fast simplify",
    );
    expect(summary("frac(2, 4)", { kind: "number", exact: "1/2" })).toBe(
      "fast simplify",
    );
  });
  test("percent means hundredths", () => {
    expect(summary("12 %", { kind: "number", exact: "0.12" })).toBe("richtig");
  });
  test("e is Euler's number", () => {
    expect(
      summary("e", { kind: "number", rounded: { value: "2.72", places: 2 } }),
    ).toBe("fast rounding");
  });
  test("an incomplete entry says so", () => {
    expect(
      checkMath(
        [{ t: "frac", n: [], d: [] }],
        { kind: "number", exact: "1" },
        m,
      )?.message,
    ).toBe("incomplete");
  });
  test("nothing entered is no check at all", () => {
    expect(checkMath([], { kind: "number", exact: "1" }, m)).toBeNull();
  });
});

describe("terms", () => {
  const answer: MathAnswer = {
    kind: "term",
    expected: "4 x^3",
    variables: ["x"],
  };
  test("equal at random points", () => {
    expect(summary("4 x^3", answer)).toBe("richtig");
    expect(summary("x^3 · 4", answer)).toBe("richtig");
  });
  test("coefficients must be simplified", () => {
    expect(summary("2 · 2 x^3", answer)).toBe("fast simplify");
  });
  test("a different term is not yet right", () => {
    expect(summary("4 x^4", answer)).toBe("nochNicht");
  });
});

describe("solution sets", () => {
  const answer: MathAnswer = {
    kind: "set",
    elements: [
      { kind: "number", exact: "-4" },
      { kind: "number", exact: "2" },
    ],
  };
  const set = (typst: string, none = false) =>
    checkMath({ row: row(typst), none }, answer, m);
  test("order doesn't matter", () => {
    expect(set("2; −4")?.state).toBe("richtig");
  });
  test("a missing solution is almost", () => {
    expect(set("2")?.message).toBe("missing");
  });
  test("each element gets its own state", () => {
    expect(set("2; 5")?.items).toEqual({ "0": "richtig", "1": "nochNicht" });
  });
  test("the empty set expects 'no solution'", () => {
    const empty: MathAnswer = { kind: "set", elements: [] };
    expect(checkMath({ row: [], none: true }, empty, m)?.state).toBe("richtig");
    expect(checkMath({ row: row("1") }, empty, m)?.state).toBe("nochNicht");
    expect(set("", true)?.state).toBe("nochNicht");
  });
});

describe("parts", () => {
  test("::fehler turns a known wrong answer into its question", () => {
    const antwort = part("p", "Antwort", {
      answer: { exact: "4 x^3" },
      markers: { fehler: [{ answer: "4 x^4", feedback: "Exponent?" }] },
    });
    expect(checkPart(antwort, row("4x^4"), m)).toEqual({
      state: "nochNicht",
      message: "Exponent?",
    });
    expect(checkPart(antwort, row("4x^3"), m)?.state).toBe("richtig");
  });

  test("the compiled answer becomes a term or a number rule", () => {
    expect(mathAnswerOf({ exact: "4 x^3" }).kind).toBe("term");
    expect(
      mathAnswerOf({ exact: "1/3", rounded: "0.33", decimals: 2 }),
    ).toEqual({
      kind: "number",
      exact: "1/3",
      rounded: { value: "0.33", places: 2 },
    });
  });

  test("Auswahl compares the selected set", () => {
    const auswahl = part("p", "Auswahl", {
      multiple: true,
      options: [
        { content: [], correct: true },
        { content: [], correct: false },
        { content: [], correct: true },
      ],
    });
    const [a, , c] = [0, 1, 2].map((i) => optionId("p", i));
    expect(checkPart(auswahl, [c, a], m)?.state).toBe("richtig");
    expect(checkPart(auswahl, [a], m)?.state).toBe("nochNicht");
    expect(checkPart(auswahl, [], m)).toBeNull();
  });

  test("an Auftrag is never checked", () => {
    expect(checkPart(part("p", "Auftrag"), "text", m)).toBeNull();
  });

  test("gaps: free gaps are named, text ignores case, math gaps follow the number rules", () => {
    const einsetzen = part("p", "Einsetzen", {
      content: [
        {
          type: "paragraph",
          children: [
            gap("g0", "Exponenten"),
            gap("g1", "1", { choices: ["1", "2"] }),
            gap("g2", "1/2", { math: true }),
          ],
        },
      ],
    });
    const gaps = gapsOf(einsetzen.content);
    expect(checkGaps(gaps, { g0: "exponenten " }, m)?.message).toBe("free:2");
    const right = checkPart(
      einsetzen,
      { g0: "exponenten", g1: "1", g2: row("1/2") },
      m,
    );
    expect(right?.items).toEqual({
      g0: "richtig",
      g1: "richtig",
      g2: "richtig",
    });
    const wrongChoice = checkGaps(
      gaps,
      { g0: "exponenten", g1: "2", g2: row("1/2") },
      m,
    );
    expect(wrongChoice?.state).toBe("nochNicht");
  });
});

describe("compiled sets and vectors", () => {
  test("a solution set from the compiled answer: order is free, none is an answer", () => {
    const set = part("p", "Antwort", {
      answer: {
        exact: "{-4, 2}",
        kind: "set",
        elements: [
          { exact: "-4", checkRow: row("-4") },
          { exact: "2", checkRow: row("2") },
        ],
      },
    });
    expect(checkPart(set, { row: row("2; −4") }, m)?.state).toBe("richtig");
    expect(checkPart(set, { row: row("2") }, m)?.message).toBe("missing");
    expect(checkPart(set, { row: row("2; 5") }, m)?.items).toEqual({
      "0": "richtig",
      "1": "nochNicht",
    });
    expect(checkPart(set, { row: [], none: true }, m)?.state).toBe("nochNicht");
    const none = part("p", "Antwort", {
      answer: { exact: "{}", kind: "set", elements: [] },
    });
    expect(checkPart(none, { row: [], none: true }, m)?.state).toBe("richtig");
    expect(checkPart(none, { row: row("1") }, m)?.state).toBe("nochNicht");
  });

  test("a vector from the compiled answer: components separated by ;", () => {
    const vector = part("p", "Antwort", {
      answer: {
        exact: "vec(1, 1/2)",
        kind: "vector",
        elements: [
          { exact: "1", checkRow: row("1") },
          { exact: "1/2", checkRow: row("1/2") },
        ],
      },
    });
    expect(checkPart(vector, row("1; 1/2"), m)?.state).toBe("richtig");
    expect(checkPart(vector, row("1; 3"), m)?.items).toEqual({
      "0": "richtig",
      "1": "nochNicht",
    });
    expect(checkPart(vector, row("1"), m)?.state).toBe("nochNicht");
  });
});

describe("Graph: functions as terms in x", () => {
  const graph = part("graph", "Graph", {
    answers: [
      { exact: "2x + 3", checkRow: row("2x + 3") },
      { exact: "-x + 4", checkRow: row("-x + 4") },
    ],
  });
  const enter = (...terms: string[]) =>
    Object.fromEntries(terms.map((term, i) => [String(i), row(term)]));

  test("equivalent writings are correct, per position", () => {
    const own = checkPart(graph, enter("3 + 2x", "4 - x"), m);
    expect(own?.state).toBe("richtig");
    expect(own?.items).toEqual({ "0": "richtig", "1": "richtig" });
  });
  test("a wrong or swapped function is marked on its own field", () => {
    const own = checkPart(graph, enter("2x + 3", "x + 4"), m);
    expect(own?.state).toBe("nochNicht");
    expect(own?.items).toEqual({ "0": "richtig", "1": "nochNicht" });
    expect(checkPart(graph, enter("-x + 4", "2x + 3"), m)?.state).toBe(
      "nochNicht",
    );
  });
  test("an empty field is not yet right; nothing entered is no check", () => {
    const own = checkPart(graph, enter("2x + 3"), m);
    expect(own?.state).toBe("nochNicht");
    expect(own?.message).toBe("free:1");
    expect(checkPart(graph, {}, m)).toBeNull();
  });
  test("an unfinished entry is wrong", () => {
    expect(checkPart(graph, enter("2x +", "4 - x"), m)?.state).toBe(
      "nochNicht",
    );
  });
});
