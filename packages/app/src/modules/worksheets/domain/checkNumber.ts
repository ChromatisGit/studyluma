import {
  decimalPlaces,
  evaluate,
  hasDecimal,
  relativelyEqual,
  tryParse,
  unsimplified,
  type Ast,
  type MathRow,
} from "../../content-renderer";
import type {
  CheckMessages,
  CheckResult,
  CheckState,
  NumberAnswer,
} from "./contract";

import { typstToRow } from "@studyluma/catalog-contract";

export const result = (
  state: CheckState,
  message?: string,
  note?: string,
): CheckResult => ({
  state,
  ...(message ? { message } : {}),
  ...(note ? { note } : {}),
});

/** The expected answer without the insides of `sin(…)`, `ln(…)` and so on. */
function outsideCalls(exact: string): string {
  const call = /(?:sin|cos|ln)(?:\^\d+|\^\([^()]*\))?\([^()]*\)/g;
  for (let text = exact; ;) {
    const next = text.replace(call, "f");
    if (next === text) {
      return text;
    }
    text = next;
  }
}

function exactForm(written: string): "pi" | "root" | "fraction" | null {
  const exact = outsideCalls(written);
  if (/pi/.test(exact)) {
    return "pi";
  }
  if (/sqrt/.test(exact)) {
    return "root";
  }
  return /\//.test(exact) ? "fraction" : null;
}

/**
 * The expected answer as a value tree. An expected answer that can't be read
 * (an authoring slip the compiler missed) gives `null`, never an exception.
 */
export function parseExpected(
  row: MathRow | undefined,
  typst?: string,
): Ast | null {
  try {
    return tryParse(row ?? typstToRow(typst ?? ""));
  } catch {
    return null;
  }
}

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
  const expected =
    answer.exactRow || answer.exact !== undefined
      ? parseExpected(answer.exactRow, answer.exact)
      : null;
  if (expected === null && (answer.exactRow || answer.exact !== undefined)) {
    return result("nochNicht");
  }
  const exact = expected ? evaluate(expected) : null;
  const decimal = hasDecimal(ast);
  if (exact !== null && relativelyEqual(value, exact)) {
    if (unsimplified(ast)) {
      return result("fast", m.simplify);
    }
    if (decimal && answer.exact && /\//.test(outsideCalls(answer.exact))) {
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
