/**
 * Preprocesses Typst math source to work around kern-typ parser gaps.
 *
 * Two known cases:
 * 1. Bare slash division (e.g. `5/2`) — valid Typst shorthand for frac(), but
 *    kern does not support `/` as a fraction operator. Rewrite to frac().
 * 2. Bare colon (`:`) — kern rejects it as an unexpected token. Replace with
 *    the Unicode ratio sign (U+2236 ∶), which is visually identical and passes.
 */
export function preprocessTypstMath(source: string): string {
  let s = source;

  // Pass 1: bare slash → frac(). Repeat until stable to handle chained cases
  // like x^(1/2) where the first pass converts the inner / only.
  let prev: string;
  do {
    prev = s;
    s = s.replace(/(\w+)\/(\w+)/g, "frac($1,$2)");
  } while (s !== prev);

  // Pass 2: bare colon → U+2236 RATIO SIGN (∶)
  s = s.replace(/:/g, "∶");

  return s;
}
