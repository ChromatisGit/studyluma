import { z } from "zod";
import { typstToRow } from "@studyluma/catalog-contract";
import type { MathRow } from "@studyluma/catalog-contract";
import type { GraphicSpec } from "./schema";
import { codedIssue, parseToml } from "./toml";

const DEFAULT_RANGE: [number, number] = [-5, 5];
/** Names with a fixed meaning in the answer evaluator. */
const RESERVED = new Set(["x", "e", "y"]);

/** The letters of a row other than x and the constants e and π. */
export function letters(row: MathRow, out = new Set<string>()): Set<string> {
  for (const node of row) {
    if (node.t === "c") {
      if (
        /\p{L}/u.test(node.v) &&
        node.v !== "π" &&
        node.v !== "x" &&
        node.v !== "e"
      )
        out.add(node.v);
    } else if (node.t === "frac") {
      letters(node.n, out);
      letters(node.d, out);
    } else if (node.t === "sqrt") letters(node.b, out);
    else letters(node.e, out);
  }
  return out;
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

const number = z.number().finite();
const name = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe("Label shown next to the graph or point.");

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
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.von >= p.bis || p.schritt <= 0 || p.start < p.von || p.start > p.bis)
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
    data.graph.forEach((g, index) => {
      for (const letter of letters(g.row))
        if (!known.has(letter))
          ctx.addIssue(
            codedIssue(
              "GRAPHIC_VARIABLE",
              `"${letter}" in "${g.term}" is neither x nor a declared parameter`,
              ["graph", index, "term"],
            ),
          );
    });
    return {
      axes: data.achsen,
      graphs: data.graph.map((g) => ({
        source: g.source,
        row: g.row,
        ...(g.name ? { name: g.name } : {}),
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
      })),
      ...(data.eingabe ? { input: data.eingabe } : {}),
    };
  });

/**
 * Reads and validates the TOML of a Grafik file. Problems are reported to
 * `problem` (the compiler adds the file and the line of the `::grafik`).
 */
export function parseGraphic(
  source: string,
  problem: (code: string, message: string) => void,
): GraphicSpec | undefined {
  const result = parseToml(source, graphicSchema, {
    code: "GRAPHIC_CONFIG",
    unknownKeyCode: "GRAPHIC_KEY",
  });
  if (result.ok) return result.value;
  for (const issue of result.issues)
    problem(
      issue.code,
      issue.line ? `${issue.message} (line ${issue.line})` : issue.message,
    );
  return undefined;
}
