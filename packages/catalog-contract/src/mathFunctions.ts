import type { MathRow } from "./mathNodes";

/**
 * The functions the answer evaluator knows. In a row a call is just the
 * letters of the name directly followed by `(` (or by an exponent box and
 * `(`, as in `sin²(x)`); angles are radians.
 */
export const FUNCTION_NAMES = ["sin", "cos", "ln"] as const;
export type FunctionName = (typeof FUNCTION_NAMES)[number];

/**
 * Functions authors and students may expect but that do not exist here.
 * Longer names come first so that `arcsin` is found before `sin` matters.
 * No short aliases like `asin`: `a sin(x)` is written the same way.
 */
export const UNSUPPORTED_FUNCTIONS = [
  "arcsin",
  "arccos",
  "arctan",
  "arccot",
  "sinh",
  "cosh",
  "tanh",
  "coth",
  "tan",
  "cot",
  "sec",
  "csc",
  "log",
  "exp",
] as const;

/** What a run of letters in a row means. */
export type LetterRun =
  /** Plain letters: variables and parameters (`m x`, `ab`). */
  | { kind: "letters"; letters: string }
  /** A call; `letters` are the variables written before the name (`a sin(x)`). */
  | { kind: "call"; name: FunctionName; letters: string }
  /** A name of this evaluator without its brackets (`sin x`, `sinx`). */
  | { kind: "bare"; name: FunctionName }
  /** A function that does not exist here (`tan(x)`, `arcsin(x)`). */
  | { kind: "unsupported"; name: string };

/**
 * Reads a run of letters; `call` tells whether `(` (or an exponent box and
 * `(`) follows it. A run is a call when it ends in a function name that is
 * followed by its brackets; the letters before the name are variables. A
 * name anywhere else lacks its brackets.
 */
export function classifyLetterRun(word: string, call: boolean): LetterRun {
  if (call) {
    const gone = UNSUPPORTED_FUNCTIONS.find((n) => word.endsWith(n));
    if (gone) {
      return { kind: "unsupported", name: gone };
    }
  }
  const name = call ? FUNCTION_NAMES.find((n) => word.endsWith(n)) : undefined;
  const rest = name ? word.slice(0, -name.length) : word;
  const bare = FUNCTION_NAMES.find((n) => rest.includes(n));
  if (bare) {
    return { kind: "bare", name: bare };
  }
  const gone = UNSUPPORTED_FUNCTIONS.find((n) => rest.includes(n));
  if (gone) {
    return { kind: "unsupported", name: gone };
  }
  return name
    ? { kind: "call", name, letters: rest }
    : { kind: "letters", letters: rest };
}

/**
 * Whether the exponent between a function name and its brackets is negative,
 * as in `sin^(-1)(x)`: that would be the inverse function, which does not
 * exist here.
 */
export const isInverseExponent = (exponent: MathRow): boolean => {
  const first = exponent[0];
  return first?.t === "c" && (first.v === "-" || first.v === "−");
};
