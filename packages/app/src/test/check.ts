import { typstToRow } from "@studyluma/catalog-contract";
import type { CheckMessages, MathAnswer } from "../modules/worksheets";

/** Check messages as plain markers, so tests can see which one was chosen. */
export const m: CheckMessages = {
  simplify: "simplify",
  preferFraction: "fraction",
  exact: (form) => `exact:${form}`,
  places: (n) => `places:${n}`,
  rounding: "rounding",
  incomplete: "incomplete",
  functionBrackets: (name) => `brackets:${name}`,
  functionMissing: (name) => `missing:${name}`,
  missingSolution: "missing",
  freeGaps: (n) => `free:${n}`,
  inCell: (cell, message) => `${cell.row}/${cell.column}: ${message}`,
};

export const row = (typst: string) => typstToRow(typst);
/** An expected term in `variables`. */
export const term = (expected: string, variables = ["x"]): MathAnswer => ({
  kind: "term",
  expected,
  variables,
});

/** The answer as the compiler prepares it: the written form and its row. */
export const compiled = (written: string) => ({
  exact: written,
  checkRow: typstToRow(written),
});
