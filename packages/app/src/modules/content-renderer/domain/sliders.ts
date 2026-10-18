/**
 * A slider value on its step grid, without float noise: `from + k · step`
 * for the nearest `k`, rounded to a few digits beyond the step's own
 * decimals (a slider from 0 in steps of π/12 never reports -2e-16) and kept
 * inside `[from, to]`.
 */
export function snapToStep(
  value: number,
  from: number,
  to: number,
  step: number,
): number {
  if (!Number.isFinite(value) || !(step > 0)) {
    return value;
  }
  const decimals = Math.max(0, Math.ceil(-Math.log10(step))) + 8;
  const scale = 10 ** decimals;
  const snapped = from + Math.round((value - from) / step) * step;
  const clean = Math.round(snapped * scale) / scale;
  // `+ 0` turns a -0 into 0.
  return Math.min(Math.max(clean, from), to) + 0;
}
