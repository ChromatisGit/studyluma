import { describe, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { typstToRow } from "@studyluma/catalog-contract";
import { CompileFailure, compileContent } from "../src/compile";
import { functionProblems, letters } from "../src/graphic";
import { CHAPTER, makeContent as make } from "./fixture";

function edit(root: string, path: string, change: (source: string) => string) {
  const file = join(root, CHAPTER, path);
  writeFileSync(file, change(readFileSync(file, "utf8")));
}

function diagnostics(root: string) {
  try {
    compileContent(root);
    return [];
  } catch (e) {
    if (e instanceof CompileFailure) return e.diagnostics;
    throw e;
  }
}

/** The Folgeblatt with `body` appended, and optionally a Grafik file. */
function sheet(body: string, toml?: string) {
  const root = make(toml ? { [`${CHAPTER}/grafiken/g.toml`]: toml } : {});
  edit(root, "aufgaben/Folgeblatt.md", (s) => s + body);
  return root;
}

const GRAPH = "\n## Graph\n\nText.\n\n::grafik [G](../grafiken/g.toml)\n";
const INPUT = '[eingabe]\ntyp = "funktion"\n';

describe("letters(): function names are no letters", () => {
  const of = (typst: string) => [...letters(typstToRow(typst))].sort();

  test("sin, cos and ln with brackets add nothing", () => {
    expect(of("sin(x)")).toEqual([]);
    expect(of("2 cos(pi x) + ln(x)")).toEqual([]);
    expect(of("sin^2(x)")).toEqual([]);
    expect(of("sin(cos(x))")).toEqual([]);
  });

  test("other letters still count, also before a function", () => {
    expect(of("a sin(x)")).toEqual(["a"]);
    expect(of("sin(a x + b)")).toEqual(["a", "b"]);
    expect(of("m x + b")).toEqual(["b", "m"]);
    expect(of("ln(x) n")).toEqual(["n"]);
  });

  test("a name without brackets is collected as the whole name", () => {
    expect(of("sin x")).toEqual(["sin"]);
    expect(of("2 cos x + ln(x)")).toEqual(["cos"]);
    expect(of("ln x")).toEqual(["ln"]);
    expect(of("sin^2 x")).toEqual(["sin"]);
  });

  test("functions that do not exist are collected as the whole name", () => {
    expect(of("tan(x)")).toEqual(["tan"]);
    expect(of("arcsin(x)")).toEqual(["arcsin"]);
    expect(of("2 arctan(x) + log(x)")).toEqual(["arctan", "log"]);
    expect(of("a tanh(x)")).toEqual(["tanh"]);
    expect(of("tan x")).toEqual(["tan"]);
  });

  test("single letters next to a function stay single letters", () => {
    expect(of("a sin(b x)")).toEqual(["a", "b"]);
    expect(of("asin(x)")).toEqual(["a"]);
    expect(of("m t")).toEqual(["m", "t"]);
  });
});

describe("functionProblems()", () => {
  const of = (typst: string) => functionProblems(typstToRow(typst));

  test("tells missing brackets, missing functions and inverses apart", () => {
    expect(of("sin x")).toEqual(["sin needs brackets: sin(x)"]);
    expect(of("tan(x)")).toEqual(["tan is not available; use sin, cos or ln"]);
    expect(of("arcsin(x)")).toEqual([
      "arcsin is not available; use sin, cos or ln",
    ]);
    expect(of("sin^(-1)(x)")).toEqual([
      "sin with a negative exponent is not available (sin^(-1) would be the inverse function); write 1/sin(x) for the reciprocal",
    ]);
  });

  test("valid functions have no problem", () => {
    expect(of("sin(x)")).toEqual([]);
    expect(of("2 cos^2(x) + ln(x)")).toEqual([]);
    expect(of("sin^(2)(x)")).toEqual([]);
    expect(of("a sin(b x)")).toEqual([]);
    expect(of("sin(x)^(-1)")).toEqual([]);
  });

  test("an inverse inside a fraction or a root is found", () => {
    expect(of("sqrt(cos^(-1)(x))")).toHaveLength(1);
    expect(of("1/ln^(-1)(x)")).toHaveLength(1);
    expect(of("cos^(-2)(x)")).toHaveLength(1);
  });
});

describe("answers with sin, cos and ln", () => {
  test("an Antwort and a gap with functions compile", () => {
    const root = sheet(
      "\n## Antwort\n\nAbleite.\n\n::antwort\n2 sin(x)\n\n## Antwort\n\nQuadrat.\n\n::antwort\nsin^2(x)\n\n## Antwort\n\nWert.\n\n::antwort\nsin(pi/6) ~ 0.5\n\n## Einsetzen\n\nEs gilt ((cos(pi x))) und ((ln(x))).\n",
    );
    expect(diagnostics(root)).toEqual([]);
    const { bundle } = compileContent(root);
    const text = JSON.stringify(bundle);
    expect(text).toContain('"exact":"sin^2(x)"');
    expect(text).toContain('"exact":"cos(pi x)"');
  });

  test("the check row keeps the function name as letters, an exponent as a box", () => {
    const root = sheet("\n## Antwort\n\nQuadrat.\n\n::antwort\nsin^2(x)\n");
    const row = JSON.stringify(
      compileContent(root).bundle.worksheets.find(
        (w) => w.filename === "Folgeblatt",
      ),
    );
    expect(row).toContain(
      '[{"t":"c","v":"s"},{"t":"c","v":"i"},{"t":"c","v":"n"},{"t":"sup","e":[{"t":"c","v":"2"}]},{"t":"c","v":"("}',
    );
  });

  test("a function name without brackets in an answer is an error", () => {
    const root = sheet("\n## Antwort\n\nAbleite.\n\n::antwort\n2 sin x\n");
    const found = diagnostics(root).filter((d) => d.code === "ANSWER_MATH");
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain("sin");
    expect(found[0]!.message).toContain("needs brackets: sin(x)");
  });

  test("the same in a gap and inside a solution set", () => {
    const gap = sheet("\n## Einsetzen\n\nEs gilt ((2 cos x)).\n\n");
    expect(diagnostics(gap).map((d) => d.code)).toContain("ANSWER_MATH");
    const set = sheet("\n## Antwort\n\nLöse.\n\n::antwort\n{2 ln x; 1}\n");
    expect(diagnostics(set).map((d) => d.code)).toContain("ANSWER_MATH");
  });

  test("a plain word answer that merely contains letters is still text", () => {
    const root = sheet(
      "\n## Antwort\n\nWie heißt die Funktion?\n\n::antwort\nsin\n",
    );
    expect(diagnostics(root)).toEqual([]);
  });
});

describe("Graph answers with functions", () => {
  test("sin(x) is an expected function; other letters are still refused", () => {
    const ok = sheet(
      `${GRAPH}\n::antwort\ny = 2 sin(x)\n`,
      `${INPUT}\n[[graph]]\nterm = "y = sin(x)"\n`,
    );
    expect(diagnostics(ok)).toEqual([]);
    const foreign = sheet(
      `${GRAPH}\n::antwort\ny = a sin(x)\n`,
      `${INPUT}\n[[graph]]\nterm = "y = sin(x)"\n`,
    );
    expect(diagnostics(foreign).map((d) => d.code)).toContain(
      "ANSWER_VARIABLE",
    );
  });

  test("a function name without brackets in a Graph answer is an error", () => {
    const root = sheet(
      `${GRAPH}\n::antwort\ny = cos x\n`,
      `${INPUT}\n[[graph]]\nterm = "y = sin(x)"\n`,
    );
    const found = diagnostics(root).filter((d) => d.code === "ANSWER_MATH");
    expect(found.map((d) => d.message).join()).toContain(
      "needs brackets: cos(x)",
    );
  });
});

describe("Grafik with functions", () => {
  const spec = (toml: string) =>
    sheet("\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n", toml);
  const slider =
    '[[parameter]]\nname = "a"\nvon = 1\nbis = 3\nschritt = 1\nstart = 1\n';

  test("curves with sin, cos, ln and a slider compile", () => {
    const root = spec(
      `[[graph]]\nterm = "y = a sin(x)"\n\n[[graph]]\nterm = "y = cos(a x)"\n\n[[graph]]\nterm = "y = ln(x)"\n\n[[graph]]\nterm = "y = sin^2(x)"\n\n${slider}`,
    );
    expect(diagnostics(root)).toEqual([]);
  });

  test("the letters of a function name are no undeclared parameters", () => {
    const root = spec('[[graph]]\nterm = "y = sin(x)"\n');
    expect(diagnostics(root).map((d) => d.code)).not.toContain(
      "GRAPHIC_VARIABLE",
    );
  });

  test("an undeclared parameter next to a function is still reported", () => {
    const root = spec('[[graph]]\nterm = "y = b sin(x)"\n');
    expect(diagnostics(root).map((d) => d.code)).toContain("GRAPHIC_VARIABLE");
  });

  test("a function name without brackets is a clear GRAPHIC_FUNCTION error", () => {
    const root = spec('[[graph]]\nterm = "y = sin x"\n');
    const found = diagnostics(root).filter(
      (d) => d.code === "GRAPHIC_FUNCTION",
    );
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain("needs brackets: sin(x)");
    expect(diagnostics(root).map((d) => d.code)).not.toContain(
      "GRAPHIC_VARIABLE",
    );
  });
});

describe("functions that do not exist, and inverse functions", () => {
  const messages = (root: string, code: string) =>
    diagnostics(root)
      .filter((d) => d.code === code)
      .map((d) => d.message);

  test.each([
    "tan",
    "arcsin",
    "arccos",
    "arctan",
    "cot",
    "log",
    "exp",
    "sinh",
    "cosh",
    "tanh",
  ])("%s in an answer is one clear ANSWER_MATH error", (name) => {
    const root = sheet(`\n## Antwort\n\nAbleite.\n\n::antwort\n2 ${name}(x)\n`);
    const found = messages(root, "ANSWER_MATH");
    expect(found).toHaveLength(1);
    expect(found[0]).toContain(`${name} is not available; use sin, cos or ln`);
    expect(diagnostics(root).map((d) => d.code)).not.toContain(
      "ANSWER_VARIABLE",
    );
  });

  test("the same in a gap, a set and a vector element", () => {
    const gap = sheet("\n## Einsetzen\n\nEs gilt ((tan(x))).\n\n");
    expect(messages(gap, "ANSWER_MATH")).toHaveLength(1);
    const set = sheet("\n## Antwort\n\nLöse.\n\n::antwort\n{arcsin(1); 1}\n");
    expect(messages(set, "ANSWER_MATH")[0]).toContain(
      "arcsin is not available",
    );
    const vector = sheet("\n## Antwort\n\nV.\n\n::antwort\nvec(1; tan(2))\n");
    expect(messages(vector, "ANSWER_MATH")[0]).toContain(
      "tan is not available",
    );
  });

  test("a bare tan x gives the same error, not a product of letters", () => {
    const root = sheet("\n## Antwort\n\nAbleite.\n\n::antwort\n2 tan x\n");
    expect(messages(root, "ANSWER_MATH")[0]).toContain("tan is not available");
  });

  test("a Graph answer with tan is an ANSWER_MATH error", () => {
    const root = sheet(
      `${GRAPH}\n::antwort\ny = tan(x)\n`,
      `${INPUT}\n[[graph]]\nterm = "y = sin(x)"\n`,
    );
    const found = messages(root, "ANSWER_MATH");
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("tan is not available; use sin, cos or ln");
    expect(diagnostics(root).map((d) => d.code)).not.toContain(
      "ANSWER_VARIABLE",
    );
  });

  test("a Grafik term with tan is a GRAPHIC_FUNCTION error without a variable error", () => {
    const root = sheet(
      "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
      '[[graph]]\nterm = "y = tan(x)"\n\n[[graph]]\nterm = "y = arcsin(x)"\n',
    );
    const found = messages(root, "GRAPHIC_FUNCTION");
    expect(found).toHaveLength(2);
    expect(found[0]).toContain("tan is not available; use sin, cos or ln");
    expect(found[1]).toContain("arcsin is not available");
    expect(diagnostics(root).map((d) => d.code)).not.toContain(
      "GRAPHIC_VARIABLE",
    );
  });

  test("a declared single letter t still works as a parameter", () => {
    const root = sheet(
      "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
      '[[graph]]\nterm = "y = t x + sin(t)"\n\n[[parameter]]\nname = "t"\nvon = 1\nbis = 3\nschritt = 1\nstart = 1\n',
    );
    expect(diagnostics(root)).toEqual([]);
  });

  test("sin^(-1) is refused in answers, gaps and Grafik terms", () => {
    const answer = sheet("\n## Antwort\n\nW.\n\n::antwort\nsin^(-1)(x)\n");
    expect(messages(answer, "ANSWER_MATH")[0]).toContain("inverse function");
    const gap = sheet("\n## Einsetzen\n\nEs gilt ((cos^(-1)(x))).\n\n");
    expect(messages(gap, "ANSWER_MATH")[0]).toContain(
      "cos with a negative exponent",
    );
    const graph = sheet(
      `${GRAPH}\n::antwort\ny = sin^(-1)(x)\n`,
      `${INPUT}\n[[graph]]\nterm = "y = sin(x)"\n`,
    );
    expect(messages(graph, "ANSWER_MATH")[0]).toContain("inverse function");
    const grafik = sheet(
      "\n## Auftrag\n\n::grafik [G](../grafiken/g.toml)\n",
      '[[graph]]\nterm = "y = ln^(-1)(x)"\n',
    );
    expect(messages(grafik, "GRAPHIC_FUNCTION")[0]).toContain(
      "ln with a negative exponent",
    );
  });

  test("sin^2(x), sin^(2)(x) and sin(x)^(-1) are fine", () => {
    const root = sheet(
      "\n## Antwort\n\nA.\n\n::antwort\nsin^2(x)\n\n## Antwort\n\nB.\n\n::antwort\nsin(x)^(-1)\n",
    );
    expect(diagnostics(root)).toEqual([]);
  });

  test("a bare function name is an error even without digit or operator", () => {
    const answer = sheet("\n## Antwort\n\nAbleite.\n\n::antwort\nsin x\n");
    expect(messages(answer, "ANSWER_MATH")[0]).toContain("sin needs brackets");
    const gap = sheet("\n## Einsetzen\n\nEs gilt ((cos x)) und ((ln 2)).\n\n");
    expect(messages(gap, "ANSWER_MATH")).toHaveLength(2);
    const pi = sheet("\n## Antwort\n\nW.\n\n::antwort\nsin pi\n");
    expect(messages(pi, "ANSWER_MATH")).toHaveLength(1);
  });

  test("words that merely contain a function name stay text", () => {
    for (const word of [
      "sinus",
      "Sinus und Kosinus",
      "ln",
      "cos",
      "sin und cos",
    ]) {
      const root = sheet(`\n## Antwort\n\nWie?\n\n::antwort\n${word}\n`);
      expect(diagnostics(root)).toEqual([]);
    }
  });
});
