import { z } from "zod";
import {
  FUNCTION_NAMES,
  classifyLetterRun,
  isInverseExponent,
  typstToRow,
} from "@studyluma/catalog-contract";
import type { MathRow } from "@studyluma/catalog-contract";
import { constantValue } from "./constant";
import type { GraphicSpec } from "./schema";
import { codedIssue, parseToml } from "./toml";

const DEFAULT_RANGE: [number, number] = [-5, 5];
/** `x-raster`: the x grid in multiples of π, as the denominator of the step. */
const X_GRIDS = { pi: 1, "pi/2": 2, "pi/4": 4 } as const;
/** A raster with fewer or more lines than this in view is likely a mistake. */
const GOOD_LINES = { min: 3, max: 16 } as const;
/** More lines than this cannot be read and is refused. */
const MAX_LINES = 40;
/** Names with a fixed meaning in the answer evaluator. */
const RESERVED = new Set(["x", "e", "y"]);

/**
 * The letters of a row other than x and the constants e and π. The names of
 * sin, cos and ln are no letters when their brackets follow. A name without
 * brackets and the name of a function that does not exist (`tan`) are
 * collected as the whole name (two or more characters); `functionProblem`
 * tells which of the two it is.
 */
export function letters(row: MathRow, out = new Set<string>()): Set<string> {
  const isLetter = (node: MathRow[number] | undefined) =>
    node?.t === "c" && node.v !== "π" && /\p{L}/u.test(node.v);
  const isOpen = (node: MathRow[number] | undefined) =>
    node?.t === "c" && node.v === "(";
  for (let i = 0; i < row.length; i++) {
    const node = row[i]!;
    if (node.t === "c") {
      if (!isLetter(node)) continue;
      let end = i;
      while (isLetter(row[end + 1])) end++;
      const word = row
        .slice(i, end + 1)
        .map((n) => (n as { v: string }).v)
        .join("");
      const next = row[end + 1];
      const run = classifyLetterRun(
        word,
        isOpen(next) || (next?.t === "sup" && isOpen(row[end + 2])),
      );
      if (run.kind === "bare" || run.kind === "unsupported") out.add(run.name);
      else
        for (const letter of run.letters)
          if (letter !== "x" && letter !== "e") out.add(letter);
      i = end;
    } else if (node.t === "frac") {
      letters(node.n, out);
      letters(node.d, out);
    } else if (node.t === "sqrt") letters(node.b, out);
    else letters(node.e, out);
  }
  return out;
}

/**
 * What is wrong with a multi-character name from `letters()`: a function
 * of the evaluator without its brackets or one that does not exist.
 */
export function functionProblem(name: string): string {
  return (FUNCTION_NAMES as readonly string[]).includes(name)
    ? `needs brackets: ${name}(x)`
    : "is not available; use sin, cos or ln";
}

/** The functions in `row` that are written with an inverse exponent: `sin^(-1)(x)`. */
export function inverseFunctions(
  row: MathRow,
  out = new Set<string>(),
): Set<string> {
  row.forEach((node, i) => {
    if (node.t === "sup") {
      let start = i;
      while (start > 0 && /\p{L}/u.test(valueAt(row[start - 1]))) start--;
      const word = row.slice(start, i).map(valueAt).join("");
      const name = FUNCTION_NAMES.find((n) => word.endsWith(n));
      if (name && isInverseExponent(node.e) && valueAt(row[i + 1]) === "(")
        out.add(name);
      inverseFunctions(node.e, out);
    } else if (node.t === "frac") {
      inverseFunctions(node.n, out);
      inverseFunctions(node.d, out);
    } else if (node.t === "sqrt") inverseFunctions(node.b, out);
  });
  return out;
}

const valueAt = (node: MathRow[number] | undefined) =>
  node?.t === "c" ? node.v : "";

/**
 * Everything wrong with the functions of a row, as sentences for a message:
 * names without brackets, names that do not exist, inverse functions.
 */
export function functionProblems(row: MathRow): string[] {
  return [
    ...[...letters(row)]
      .filter((name) => name.length > 1)
      .map((name) => `${name} ${functionProblem(name)}`),
    ...[...inverseFunctions(row)].map(
      (name) =>
        `${name} with a negative exponent is not available (${name}^(-1) would be the inverse function); write 1/${name}(x) for the reciprocal`,
    ),
  ];
}

/**
 * The function of a `y = …` or `f(x) = …` line as a row. The left side is
 * optional; `x` is the independent variable.
 */
export function functionRow(
  source: string,
): { expression: string; row: MathRow } | { problem: string } {
  const text = source.trim();
  const m = /^(?:[a-zA-Z]\w*(?:\(x\))?\s*=)?\s*([^=]+)$/.exec(text);
  const expression = m?.[1]?.trim();
  if (!expression)
    return { problem: `Expected a function like y = x^2, got "${source}"` };
  if (/\bdot(?:\.op)?\b/.test(expression))
    return { problem: `Use * for multiplication instead of dot: "${source}"` };
  try {
    const row = typstToRow(expression);
    if (!row.length) return { problem: `Empty function: "${source}"` };
    return { expression, row };
  } catch (e) {
    return { problem: `Cannot read function "${source}": ${String(e)}` };
  }
}

/**
 * A number, written as a number or as Typst math that evaluates to a finite
 * number: `"pi/2"`, `"-2pi"`, `"3 pi / 4"`, `"sqrt(2)"`.
 */
const number = z
  .union([z.number().finite(), z.string()], {
    error: 'must be a number or a text like "pi/2"',
  })
  .transform((value, ctx) => {
    if (typeof value === "number") return value;
    const result = constantValue(value);
    if ("problem" in result) {
      ctx.addIssue(codedIssue("GRAPHIC_NUMBER", result.problem));
      return z.NEVER;
    }
    return result.value;
  });
const name = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe("Label shown next to the graph or point.");

/** The grid lines an `x-raster` draws in the range, the line at 0 included. */
export function gridLines(
  [min, max]: [number, number],
  grid: keyof typeof X_GRIDS,
): number {
  const step = Math.PI / X_GRIDS[grid];
  const eps = 1e-9;
  return Math.floor(max / step + eps) - Math.ceil(min / step - eps) + 1;
}

/** `x = [min, max]`: the visible range of an axis. */
const range = z.tuple([number, number]).refine(([min, max]) => min < max, {
  message: "must be [min, max] with min smaller than max",
  params: { code: "GRAPHIC_AXES" },
});

/** `[[graph]]`: one function in x, optionally named. */
const graphEntry = z
  .object({
    term: z.string().describe("The function, written like y = x^2."),
    name,
    funktion: z
      .string()
      .refine(
        (letter) =>
          /^\p{L}$/u.test(letter) && !["x", "e", "π"].includes(letter),
        {
          message: "must be a single letter other than x, e",
          params: { code: "GRAPHIC_FUNCTION_NAME" },
        },
      )
      .optional()
      .describe(
        'Grafikfolie: the name of the function; the line reads "f(x) = term".',
      ),
    anzeige: z
      .string()
      .optional()
      .describe(
        'Grafikfolie: what stands right of "f(x) =" instead of the term, written like a formula; "" shows only "f(x)".',
      ),
    sichtbar: z
      .boolean()
      .default(true)
      .describe("Grafikfolie: false starts with the curve hidden."),
  })
  .strict()
  .transform((entry, ctx) => {
    const parsed = functionRow(entry.term);
    if ("problem" in parsed) {
      ctx.addIssue(codedIssue("GRAPHIC_FUNCTION", parsed.problem, ["term"]));
      return z.NEVER;
    }
    return {
      term: entry.term,
      source: parsed.expression,
      row: parsed.row,
      name: entry.name,
      function: entry.funktion,
      display: entry.anzeige,
      visible: entry.sichtbar,
    };
  });

/** `[[punkt]]`: one point, optionally named. */
const pointEntry = z
  .object({
    position: z.tuple([number, number]).describe("[x, y] of the point."),
    name,
  })
  .strict();

/** `[[parameter]]`: one slider; the letter it names may be used in graphs. */
const parameterEntry = z
  .object({
    name: z
      .string()
      .refine(
        (letter) =>
          /^\p{L}$/u.test(letter) && !RESERVED.has(letter) && letter !== "π",
        {
          message: "must be a single letter other than x, y, e",
          params: { code: "GRAPHIC_PARAMETER" },
        },
      ),
    von: number.describe("Smallest value of the slider."),
    bis: number.describe("Largest value of the slider."),
    schritt: number.describe("Step of the slider; greater than 0."),
    start: number.describe("Initial value; between von and bis."),
    einheit: z
      .literal("pi", { error: 'must be "pi"' })
      .optional()
      .describe('"pi": the slider shows its value as a multiple of π.'),
  })
  .strict()
  .superRefine((p, ctx) => {
    // Evaluated expressions like "6pi/12" may differ from "pi/2" in the last bit.
    const eps = (p.bis - p.von) * 1e-9;
    if (
      p.von >= p.bis ||
      p.schritt <= 0 ||
      p.start < p.von - eps ||
      p.start > p.bis + eps
    )
      ctx.addIssue(
        codedIssue(
          "GRAPHIC_PARAMETER",
          `${p.name}: needs von < bis, schritt > 0 and start between von and bis`,
        ),
      );
  });

const COUNT = "must be a whole number from 1 to 6";

/** `[eingabe]`: turns the Grafik into the work area of a Graph task. */
const inputEntry = z
  .object({
    typ: z.literal("funktion").describe("Kind of input; only funktion exists."),
    anzahl: z
      .number()
      .int({ message: COUNT })
      .min(1, { message: COUNT })
      .max(6, { message: COUNT })
      .default(1),
  })
  .strict()
  .transform((e) => ({ type: "function" as const, count: e.anzahl }));

/**
 * A Grafik file: the visible range, the functions and points to show, the
 * sliders and optionally the input of a Graph task. Lists are written as
 * repeated `[[graph]]`, `[[punkt]]` and `[[parameter]]` blocks.
 */
export const graphicSchema = z
  .object({
    achsen: z
      .object({
        x: range
          .default(DEFAULT_RANGE)
          .describe("Visible range [min, max] of the x axis."),
        y: range
          .default(DEFAULT_RANGE)
          .describe("Visible range [min, max] of the y axis."),
        "x-raster": z
          .enum(Object.keys(X_GRIDS) as [keyof typeof X_GRIDS], {
            error: `must be one of ${Object.keys(X_GRIDS)
              .map((key) => `"${key}"`)
              .join(", ")}`,
          })
          .optional()
          .describe(
            'Grid and labels of the x axis in multiples of π: "pi", "pi/2" or "pi/4". Without it the axis is numeric.',
          ),
      })
      .strict()
      .prefault({})
      .describe("The visible range of both axes."),
    graph: z
      .array(graphEntry)
      .default([])
      .describe("Functions to draw; one [[graph]] block each."),
    punkt: z
      .array(pointEntry)
      .default([])
      .describe("Points to show; one [[punkt]] block each."),
    parameter: z
      .array(parameterEntry)
      .default([])
      .describe(
        "Sliders; the letter a slider names may be used in graph terms.",
      ),
    eingabe: inputEntry
      .optional()
      .describe("Turns the Grafik into the work area of a Graph task."),
  })
  .strict()
  .transform((data, ctx): GraphicSpec => {
    const known = new Set<string>();
    data.parameter.forEach((p, index) => {
      if (known.has(p.name))
        ctx.addIssue(
          codedIssue("GRAPHIC_PARAMETER", `"${p.name}" is declared twice`, [
            "parameter",
            index,
            "name",
          ]),
        );
      known.add(p.name);
    });
    const grid = data.achsen["x-raster"];
    if (grid && gridLines(data.achsen.x, grid) > MAX_LINES)
      ctx.addIssue(
        codedIssue(
          "GRAPHIC_AXES",
          `x-raster "${grid}" would draw ${gridLines(data.achsen.x, grid)} grid lines in x = [${data.achsen.x.join(", ")}]; at most ${MAX_LINES} are readable`,
          ["achsen", "x-raster"],
        ),
      );
    data.graph.forEach((g, index) => {
      if (g.display !== undefined && !g.function)
        ctx.addIssue(
          codedIssue(
            "GRAPHIC_FUNCTION_NAME",
            "anzeige needs funktion (the name of the function)",
            ["graph", index, "term"],
          ),
        );
      for (const problem of functionProblems(g.row))
        ctx.addIssue(
          codedIssue("GRAPHIC_FUNCTION", `${problem} (in "${g.term}")`, [
            "graph",
            index,
            "term",
          ]),
        );
      for (const letter of letters(g.row))
        if (letter.length === 1 && !known.has(letter))
          ctx.addIssue(
            codedIssue(
              "GRAPHIC_VARIABLE",
              `"${letter}" in "${g.term}" is neither x nor a declared parameter`,
              ["graph", index, "term"],
            ),
          );
    });
    return {
      axes: {
        x: data.achsen.x,
        y: data.achsen.y,
        ...(grid ? { xGrid: grid } : {}),
      },
      graphs: data.graph.map((g) => ({
        source: g.source,
        row: g.row,
        ...(g.name ? { name: g.name } : {}),
        ...(g.function
          ? {
              function: g.function,
              // The compiler renders `display`; only it can typeset math.
              label: {
                source:
                  g.display === ""
                    ? `${g.function}(x)`
                    : `${g.function}(x) = ${g.display ?? g.source}`,
                display: "",
              },
            }
          : {}),
        ...(g.visible ? {} : { visible: false as const }),
      })),
      points: data.punkt.map((p) => ({
        position: p.position,
        ...(p.name ? { name: p.name } : {}),
      })),
      parameters: data.parameter.map((p) => ({
        name: p.name,
        from: p.von,
        to: p.bis,
        step: p.schritt,
        start: p.start,
        ...(p.einheit ? { unit: p.einheit } : {}),
      })),
      ...(data.eingabe ? { input: data.eingabe } : {}),
    };
  });

/**
 * Reads and validates the TOML of a Grafik file. Problems are reported to
 * `problem`, doubtful but valid settings to `warn` (the compiler adds the file
 * and the line of the `::grafik`).
 */
export function parseGraphic(
  source: string,
  problem: (code: string, message: string) => void,
  warn: (code: string, message: string) => void = () => {},
): GraphicSpec | undefined {
  const result = parseToml(source, graphicSchema, {
    code: "GRAPHIC_CONFIG",
    unknownKeyCode: "GRAPHIC_KEY",
  });
  if (result.ok) {
    const { x, xGrid } = result.value.axes;
    const lines = xGrid ? gridLines(x, xGrid) : GOOD_LINES.min;
    if (lines < GOOD_LINES.min || lines > GOOD_LINES.max)
      warn(
        "GRAPHIC_RASTER",
        `x-raster "${xGrid}" draws ${lines} grid ${lines === 1 ? "line" : "lines"} in x = [${x.join(", ")}]; ${GOOD_LINES.min} to ${GOOD_LINES.max} read well. Use a coarser or finer raster or another range.`,
      );
    return result.value;
  }
  for (const issue of result.issues)
    problem(
      issue.code,
      issue.line ? `${issue.message} (line ${issue.line})` : issue.message,
    );
  return undefined;
}
