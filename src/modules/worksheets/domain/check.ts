import type {
  CheckResult,
  CheckState,
  Gap,
  MathAnswer,
  NumberAnswer,
  Task,
} from "./contract";
import {
  decimalPlaces,
  evaluate,
  hasDecimal,
  parseRow,
  relativelyEqual,
  tryParse,
  unsimplified,
  type Ast,
} from "./evaluate";
import { isMathRow, splitTop, type MathRow } from "./mathNodes";
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
  const exact = answer.exact !== undefined ? valueOf(answer.exact) : null;
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
  variables: string[],
  m: CheckMessages,
): CheckResult {
  const target = parseRow(typstToRow(expected));
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
    : checkTerm(ast, answer.expected, answer.variables, m);
}

export function checkGap(
  gap: Gap,
  value: unknown,
  m: CheckMessages,
): CheckResult | null {
  if (gap.kind === "dropdown") {
    return typeof value === "string" && value
      ? result(value === gap.correct ? "richtig" : "nochNicht")
      : null;
  }
  if (gap.kind === "text") {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }
    const a = value.trim();
    const b = gap.correct.trim();
    const same = gap.caseSensitive
      ? a === b
      : a.toLowerCase() === b.toLowerCase();
    return result(same ? "richtig" : "nochNicht");
  }
  return checkMath(value, gap.answer, m);
}

/** A Lückentext or a step line: all gaps together, each with its own state. */
export function checkGaps(
  gaps: Gap[],
  values: Record<string, unknown> | undefined,
  m: CheckMessages,
): CheckResult | null {
  const items: Record<string, CheckState> = {};
  let filled = 0;
  let wrong = 0;
  let almost: { gap: Gap; own: CheckResult } | null = null;
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
      almost = { gap, own };
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
    const message = almost.own.message ?? "";
    const text = almost.gap.cell ? m.inCell(almost.gap.cell, message) : message;
    return { ...result("fast", text), items };
  }
  return { ...result("richtig"), items };
}

/** Checks one part's task; Aufträge are never checked. */
export function checkTask(
  task: Task,
  value: unknown,
  m: CheckMessages,
): CheckResult | null {
  switch (task.type) {
    case "lueckentext":
      return checkGaps(
        task.gaps,
        value as Record<string, unknown> | undefined,
        m,
      );
    case "auswahl": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      if (!selected.length) {
        return null;
      }
      const correct = task.options
        .filter((o) => o.correct)
        .map((o) => o.id)
        .sort()
        .join();
      return result(
        [...selected].sort().join() === correct ? "richtig" : "nochNicht",
      );
    }
    case "ergebnis": {
      const own = checkMath(value, task.answer, m);
      // ::fehler: a known wrong answer gets its own question.
      if (
        own?.state === "nochNicht" &&
        task.errors &&
        task.answer.kind !== "set"
      ) {
        for (const known of task.errors) {
          const as: MathAnswer =
            task.answer.kind === "term"
              ? {
                  kind: "term",
                  expected: known.answer,
                  variables: task.answer.variables,
                }
              : { kind: "number", exact: known.answer };
          const match = checkMath(value, as, m);
          if (match && match.state !== "nochNicht") {
            return result("nochNicht", known.message);
          }
        }
      }
      return own;
    }
    default:
      return null;
  }
}
