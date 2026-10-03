import { describe, expect, test } from "bun:test";
import { checkGaps, checkMath, checkTask, type CheckMessages } from "./check";
import type { Gap, MathAnswer, Task } from "./contract";
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

describe("tasks", () => {
  test("::fehler turns a known wrong answer into its question", () => {
    const task: Task = {
      type: "ergebnis",
      prompt: "",
      answer: { kind: "term", expected: "4 x^3", variables: ["x"] },
      errors: [{ answer: "4 x^4", message: "Exponent?" }],
    };
    expect(checkTask(task, row("4x^4"), m)).toEqual({
      state: "nochNicht",
      message: "Exponent?",
    });
  });

  test("Auswahl compares the selected set", () => {
    const task: Task = {
      type: "auswahl",
      prompt: "",
      multiple: true,
      options: [
        { id: "a", label: "", correct: true },
        { id: "b", label: "", correct: false },
        { id: "c", label: "", correct: true },
      ],
    };
    expect(checkTask(task, ["c", "a"], m)?.state).toBe("richtig");
    expect(checkTask(task, ["a"], m)?.state).toBe("nochNicht");
    expect(checkTask(task, [], m)).toBeNull();
  });

  test("gaps: free gaps are named, text ignores case, cells prefix 'almost'", () => {
    const gaps: Gap[] = [
      { id: "g0", kind: "text", correct: "Exponenten", caseSensitive: false },
      { id: "g1", kind: "dropdown", options: ["1", "2"], correct: "1" },
      {
        id: "g2",
        kind: "math",
        answer: { kind: "number", exact: "1/2" },
        cell: { row: "f", column: "x" },
      },
    ];
    expect(checkGaps(gaps, { g0: "exponenten " }, m)?.message).toBe("free:2");
    const almost = checkGaps(
      gaps,
      { g0: "exponenten", g1: "1", g2: row("frac(2, 4)") },
      m,
    );
    expect(almost?.state).toBe("fast");
    expect(almost?.message).toBe("f/x: simplify");
    expect(almost?.items).toEqual({ g0: "richtig", g1: "richtig", g2: "fast" });
  });
});
