import type { Answer, TaskPart } from "../../catalog";
import {
  decimalPlaces,
  evaluate,
  gapsOf,
  hasDecimal,
  isMathRow,
  parseRow,
  relativelyEqual,
  splitTop,
  tryParse,
  unsimplified,
  type Ast,
  type GapNode,
  type MathRow,
} from "../../content-renderer";
import type {
  CheckResult,
  CheckState,
  MathAnswer,
  NumberAnswer,
} from "./contract";

import { typstToRow } from "./typst";

/** Feedback texts; the UI fills them from its `*.de.json`. */
export interface CheckMessages {
  simplify: string;
  preferFraction: string;
  exact: (form: "pi" | "root" | "fraction" | null) => string;
  places: (places: number) => string;
  rounding: string;
  incomplete: string;
  missingSolution: string;
  freeGaps: (count: number) => string;
  inCell: (cell: { row: string; column: string }, message: string) => string;
}

/** A solution set's value: one row with ";" between solutions, or none. */
export type SetValue = { row: MathRow; none?: boolean };

const result = (
  state: CheckState,
  message?: string,
  note?: string,
): CheckResult => ({
  state,
  ...(message ? { message } : {}),
  ...(note ? { note } : {}),
});

function exactForm(exact: string): "pi" | "root" | "fraction" | null {
  if (/pi/.test(exact)) {
    return "pi";
  }
  if (/sqrt/.test(exact)) {
    return "root";
  }
  return /\//.test(exact) ? "fraction" : null;
}

const valueOf = (typst: string) => evaluate(parseRow(typstToRow(typst)));

function checkRounded(
  ast: Ast,
  value: number,
  exact: number | null,
  rounded: NonNullable<NumberAnswer["rounded"]>,
  m: CheckMessages,
): CheckResult {
  const target = Number.parseFloat(rounded.value);
  const scale = 10 ** rounded.places;
  const places = decimalPlaces(ast);
  const decimal = hasDecimal(ast);
  if (
    decimal &&
    places >= rounded.places &&
    Math.abs(Math.round(value * scale) / scale - target) < 1e-9
  ) {
    return result("richtig");
  }
  const ownScale = 10 ** places;
  if (
    decimal &&
    places < rounded.places &&
    exact !== null &&
    Math.abs(Math.round(exact * ownScale) / ownScale - value) < 1e-9
  ) {
    return result("fast", m.places(rounded.places));
  }
  const reference = exact ?? target;
  if (
    Math.abs(value - reference) <=
    Math.max(0.01 * Math.abs(reference), 5 / scale)
  ) {
    return result("fast", m.rounding);
  }
  return result("nochNicht");
}

/** The number rules: equal value, exact required, rounding allowed, close. */
export function checkNumber(
  ast: Ast,
  answer: NumberAnswer,
  m: CheckMessages,
): CheckResult {
  const value = evaluate(ast);
  if (!Number.isFinite(value)) {
    return result("nochNicht");
  }
  const exact = answer.exactRow
    ? evaluate(parseRow(answer.exactRow))
    : answer.exact !== undefined
      ? valueOf(answer.exact)
      : null;
  const decimal = hasDecimal(ast);
  if (exact !== null && relativelyEqual(value, exact)) {
    if (unsimplified(ast)) {
      return result("fast", m.simplify);
    }
    if (decimal && answer.exact && /\//.test(answer.exact)) {
      return result("richtig", undefined, m.preferFraction);
    }
    return result("richtig");
  }
  if (answer.rounded) {
    return checkRounded(ast, value, exact, answer.rounded, m);
  }
  if (exact !== null && answer.exact) {
    const close =
      Math.abs(value - exact) <= Math.max(0.01 * Math.abs(exact), 1e-9);
    const form = exactForm(answer.exact);
    if (close && decimal && form) {
      return result("fast", m.exact(form));
    }
    if (close) {
      return result("fast", m.rounding);
    }
  }
  return result("nochNicht");
}

const POINTS = [0.73, 1.37, -1.91, 2.44, -0.58, 3.1, -2.6, 0.29, -1.13];

function checkTerm(
  ast: Ast,
  expected: string,
  expectedRow: MathRow | undefined,
  variables: string[],
  m: CheckMessages,
): CheckResult {
  const target = parseRow(expectedRow ?? typstToRow(expected));
  let used = 0;
  for (const x of POINTS) {
    const env = Object.fromEntries(
      variables.map((name, k) => [name, x + k * 0.31]),
    );
    const want = evaluate(target, env);
    if (!Number.isFinite(want)) {
      continue;
    }
    const got = evaluate(ast, env);
    if (!Number.isFinite(got) || !relativelyEqual(got, want)) {
      return result("nochNicht");
    }
    if (++used === 5) {
      break;
    }
  }
  return unsimplified(ast) ? result("fast", m.simplify) : result("richtig");
}

const order: Record<CheckState, number> = { richtig: 0, fast: 1, nochNicht: 2 };

function checkElements(
  entries: { row: MathRow; index: number }[],
  pick: (ast: Ast, index: number) => CheckResult,
): { items: Record<string, CheckState>; worst: CheckResult } {
  const items: Record<string, CheckState> = {};
  let worst = result("richtig");
  for (const { row, index } of entries) {
    const ast = tryParse(row);
    const own = ast ? pick(ast, index) : result("nochNicht");
    items[String(index)] = own.state;
    if (order[own.state] > order[worst.state]) {
      worst = own;
    }
  }
  return { items, worst };
}

function checkSet(
  value: SetValue,
  elements: NumberAnswer[],
  m: CheckMessages,
): CheckResult | null {
  if (value.none) {
    return result(elements.length === 0 ? "richtig" : "nochNicht");
  }
  const entries = splitTop(value.row)
    .map((row, index) => ({ row, index }))
    .filter((entry) => entry.row.length);
  if (!entries.length) {
    return null;
  }
  if (!elements.length) {
    return result("nochNicht");
  }
  const matched = new Set<number>();
  const { items, worst } = checkElements(entries, (ast) => {
    let best = result("nochNicht");
    elements.forEach((element, j) => {
      const own = checkNumber(ast, element, m);
      if (own.state === "richtig") {
        best = own;
        matched.add(j);
      } else if (own.state === "fast" && best.state !== "richtig") {
        best = own;
      }
    });
    return best;
  });
  if (worst.state !== "richtig") {
    return {
      ...result(
        worst.state,
        worst.state === "fast" ? worst.message : undefined,
      ),
      items,
    };
  }
  if (matched.size < elements.length) {
    return { ...result("fast", m.missingSolution), items };
  }
  return { ...result("richtig"), items };
}

function checkVector(
  row: MathRow,
  components: NumberAnswer[],
  m: CheckMessages,
): CheckResult | null {
  const entries = splitTop(row).map((part, index) => ({ row: part, index }));
  if (!entries.some((entry) => entry.row.length)) {
    return null;
  }
  const { items, worst } = checkElements(entries, (ast, index) => {
    const component = components[index];
    return component ? checkNumber(ast, component, m) : result("nochNicht");
  });
  if (entries.length !== components.length) {
    return { ...result("nochNicht"), items };
  }
  return { ...worst, items };
}

/** Checks a math value; `null` means nothing was entered yet. */
export function checkMath(
  value: unknown,
  answer: MathAnswer,
  m: CheckMessages,
): CheckResult | null {
  if (answer.kind === "set") {
    const set = (value ?? { row: [] }) as SetValue;
    return checkSet(set, answer.elements, m);
  }
  const row = isMathRow(value) ? value : [];
  if (!row.length) {
    return null;
  }
  if (answer.kind === "vector") {
    return checkVector(row, answer.components, m);
  }
  const ast = tryParse(row);
  if (!ast) {
    return result("nochNicht", m.incomplete);
  }
  return answer.kind === "number"
    ? checkNumber(ast, answer, m)
    : checkTerm(ast, answer.expected, answer.expectedRow, answer.variables, m);
}

/**
 * The compiled expected answer as a math rule: a term when it has
 * variables, otherwise a number with optional rounding.
 */
export function mathAnswerOf(answer: Answer | undefined): MathAnswer {
  if (answer?.kind) {
    const members = (answer.elements ?? []).map(numberAnswerOf);
    return answer.kind === "set"
      ? { kind: "set", elements: members }
      : { kind: "vector", components: members };
  }
  const exact = answer?.exact;
  const variables = [
    ...new Set((exact ?? "").match(/\b[a-z]\b/g) ?? []),
  ].filter((name) => name !== "e");
  const row = answer?.checkRow as MathRow | undefined;
  return variables.length
    ? {
        kind: "term",
        expected: exact ?? "",
        ...(row ? { expectedRow: row } : {}),
        variables,
      }
    : {
        kind: "number",
        ...(exact ? { exact } : {}),
        ...(row ? { exactRow: row } : {}),
        ...(answer?.rounded
          ? {
              rounded: {
                value: answer.rounded,
                places: answer.decimals ?? 0,
              },
            }
          : {}),
      };
}

/** A member of a set or vector: a number; a term there can't be compared. */
function numberAnswerOf(answer: Answer): NumberAnswer {
  const own = mathAnswerOf(answer);
  return own.kind === "number"
    ? own
    : { kind: "number", ...(answer.exact ? { exact: answer.exact } : {}) };
}

/** A gap or answer without math (a word) is compared as text. */
const isText = (answer: Answer | undefined) =>
  !!answer?.exact && !answer.checkRow;

export function checkGap(
  gap: GapNode,
  value: unknown,
  m: CheckMessages,
): CheckResult | null {
  if (gap.choices.length > 1) {
    return typeof value === "string" && value
      ? result(value === gap.choices[0] ? "richtig" : "nochNicht")
      : null;
  }
  const answer = gap.answer as Answer | undefined;
  const word = isText(answer) ? answer?.exact : undefined;
  if (word !== undefined) {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }
    return result(
      value.trim().toLowerCase() === word.trim().toLowerCase()
        ? "richtig"
        : "nochNicht",
    );
  }
  return checkMath(value, mathAnswerOf(answer), m);
}

/** An Einsetzen part or a step: all gaps together, each with its own state. */
export function checkGaps(
  gaps: GapNode[],
  values: Record<string, unknown> | undefined,
  m: CheckMessages,
): CheckResult | null {
  const items: Record<string, CheckState> = {};
  let filled = 0;
  let wrong = 0;
  let almost: CheckResult | null = null;
  for (const gap of gaps) {
    const own = checkGap(gap, values?.[gap.id], m);
    if (!own) {
      continue;
    }
    filled++;
    items[gap.id] = own.state;
    if (own.state === "nochNicht") {
      wrong++;
    }
    if (own.state === "fast" && !almost) {
      almost = own;
    }
  }
  if (!filled) {
    return null;
  }
  const free = gaps.length - filled;
  if (wrong || free) {
    return {
      ...result("nochNicht", free ? m.freeGaps(free) : undefined),
      items,
    };
  }
  if (almost) {
    return { ...result("fast", (almost as CheckResult).message ?? ""), items };
  }
  return { ...result("richtig"), items };
}

/**
 * A Graph part: each entered function must equal the expected one at the
 * same position as a function of x. Equivalent writings are all correct.
 */
function checkGraph(
  answers: Answer[],
  value: unknown,
  m: CheckMessages,
): CheckResult | null {
  const entered = (value ?? {}) as Record<string, unknown>;
  const items: Record<string, CheckState> = {};
  let filled = 0;
  let wrong = 0;
  answers.forEach((answer, index) => {
    const row = entered[String(index)];
    if (!isMathRow(row) || !row.length) {
      return;
    }
    filled++;
    const ast = tryParse(row);
    const target = answer.checkRow
      ? tryParse(answer.checkRow as MathRow)
      : null;
    const same = !!ast && !!target && sameFunction(ast, target);
    items[String(index)] = same ? "richtig" : "nochNicht";
    if (!same) {
      wrong++;
    }
  });
  if (!filled) {
    return null;
  }
  const free = answers.length - filled;
  if (wrong || free) {
    return {
      ...result("nochNicht", !wrong && free ? m.freeGaps(free) : undefined),
      items,
    };
  }
  return { ...result("richtig"), items };
}

function sameFunction(ast: Ast, target: Ast): boolean {
  let used = 0;
  for (const x of POINTS) {
    const want = evaluate(target, { x });
    if (!Number.isFinite(want)) {
      continue;
    }
    const got = evaluate(ast, { x });
    if (!Number.isFinite(got) || !relativelyEqual(got, want)) {
      return false;
    }
    if (++used === 5) {
      break;
    }
  }
  return used > 0;
}

/** The id of an Auswahl option, stable for a part. */
export const optionId = (partId: string, index: number) => `${partId}-${index}`;

/** Checks one part against its private answer; Aufträge are never checked. */
export function checkPart(
  part: TaskPart,
  value: unknown,
  m: CheckMessages,
): CheckResult | null {
  switch (part.type) {
    case "Einsetzen":
      return checkGaps(
        gapsOf(part.content),
        value as Record<string, unknown> | undefined,
        m,
      );
    case "Auswahl": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      if (!selected.length) {
        return null;
      }
      const correct = (part.options ?? [])
        .flatMap((option, index) =>
          option.correct ? [optionId(part.id, index)] : [],
        )
        .sort()
        .join();
      return result(
        [...selected].sort().join() === correct ? "richtig" : "nochNicht",
      );
    }
    case "Antwort": {
      const answer = mathAnswerOf(part.answer);
      const own = checkMath(value, answer, m);
      // ::fehler: a known wrong answer gets its own question.
      if (own?.state === "nochNicht") {
        for (const known of part.markers.fehler ?? []) {
          const as: MathAnswer =
            answer.kind === "term"
              ? {
                  kind: "term",
                  expected: known.answer,
                  variables: answer.variables,
                }
              : { kind: "number", exact: known.answer };
          const match = checkMath(value, as, m);
          if (match && match.state !== "nochNicht") {
            return result("nochNicht", known.feedback);
          }
        }
      }
      return own;
    }
    case "Graph":
      return checkGraph(part.answers ?? [], value, m);
    default:
      return null;
  }
}
