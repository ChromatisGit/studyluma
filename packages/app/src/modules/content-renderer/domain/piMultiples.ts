import type { Graphic } from "./rich";

/** The x grids a Grafik can have in multiples of π (`x-raster`). */
export type PiGrid = NonNullable<Graphic["axes"]["xGrid"]>;

const GRID_DIVISIONS: Record<PiGrid, number> = { pi: 1, "pi/2": 2, "pi/4": 4 };
/** Slider values within this of a fraction of π count as that fraction. */
const TOLERANCE = 1e-6;
/** Largest denominator a slider value is shown with. */
const MAX_DENOMINATOR = 12;
const MINUS = "−";
const coefficient = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 3,
});

/** A multiple of π: `numerator`/`denominator` · π, reduced, denominator > 0. */
export type PiMultiple = { numerator: number; denominator: number };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** The spacing of the grid lines, in x units. */
export const gridStep = (grid: PiGrid) => Math.PI / GRID_DIVISIONS[grid];

/** `k · step` as a reduced multiple of π; `k` counts grid steps from 0. */
export function multipleOf(k: number, grid: PiGrid): PiMultiple {
  const denominator = GRID_DIVISIONS[grid];
  const divisor = gcd(k, denominator) || 1;
  return { numerator: k / divisor, denominator: denominator / divisor };
}

/**
 * The multiple of π a value is (up to a denominator of 12), if it is one. The
 * first denominator that fits is the smallest, so the fraction is reduced.
 */
export function multipleOfPi(value: number): PiMultiple | undefined {
  const ratio = value / Math.PI;
  for (let denominator = 1; denominator <= MAX_DENOMINATOR; denominator++) {
    const scaled = ratio * denominator;
    const numerator = Math.round(scaled);
    if (Math.abs(scaled - numerator) < TOLERANCE * denominator) {
      return { numerator, denominator };
    }
  }
  return undefined;
}

/** `π`, `-π` or `3π`: the numerator of a multiple of π. */
function top({ numerator }: PiMultiple): string {
  const size = Math.abs(numerator);
  return `${numerator < 0 ? MINUS : ""}${size === 1 ? "" : size}π`;
}

/** A multiple of π as text: `0`, `π`, `−3π/4`, `2π`. */
export function piText(multiple: PiMultiple): string {
  if (multiple.numerator === 0) {
    return "0";
  }
  return multiple.denominator === 1
    ? top(multiple)
    : `${top(multiple)}/${multiple.denominator}`;
}

/** A value shown as a multiple of π: a fraction, or a rounded coefficient. */
export function formatPi(value: number): string {
  const multiple = multipleOfPi(value);
  if (multiple) {
    return piText(multiple);
  }
  const rounded = Math.round((value / Math.PI) * 1000) / 1000;
  return rounded === 0
    ? "0"
    : `${coefficient.format(rounded).replace("-", MINUS)}π`;
}

/**
 * The same for `aria-valuetext`: the coefficient is separate from π so that a
 * screen reader does not read `3π/4` as one word, and the stroke is spoken
 * as `over` ("durch"), so `π/12` reads "π durch 12" like it looks.
 */
export function spokenPi(value: number, over: string): string {
  const multiple = multipleOfPi(value);
  if (!multiple) {
    return formatPi(value).replace("π", " π");
  }
  if (multiple.numerator === 0) {
    return "0";
  }
  const sign = multiple.numerator < 0 ? MINUS : "";
  const size = Math.abs(multiple.numerator);
  const head = `${sign}${size === 1 ? "" : `${size} `}π`;
  return multiple.denominator === 1
    ? head
    : `${head} ${over} ${multiple.denominator}`;
}

/** An axis label: a whole multiple on one line, a fraction stacked. */
export type PiLabel = { top: string; bottom?: string };

export function piLabel(multiple: PiMultiple): PiLabel {
  return multiple.numerator === 0 || multiple.denominator === 1
    ? { top: piText(multiple) }
    : { top: top(multiple), bottom: String(multiple.denominator) };
}

/** A labelled grid line of the x axis; the line at 0 has none. */
export type PiTick = { x: number; k: number; label: PiLabel };

/** The labelled grid lines inside `[min, max]`. */
export function piTicks([min, max]: [number, number], grid: PiGrid): PiTick[] {
  const step = gridStep(grid);
  const eps = 1e-9;
  const first = Math.ceil(min / step - eps);
  const last = Math.min(Math.floor(max / step + eps), first + 200);
  const ticks: PiTick[] = [];
  for (let k = first; k <= last; k++) {
    if (k !== 0) {
      ticks.push({
        x: k * step,
        k,
        label: piLabel(multipleOf(k, grid)),
      });
    }
  }
  return ticks;
}

/** The width of a label in px; digits and π are about 0.6 em wide. */
export function labelWidth(label: PiLabel, fontSize: number): number {
  const chars = Math.max(label.top.length, label.bottom?.length ?? 0);
  return chars * fontSize * 0.6;
}

/**
 * Show every n-th label so that neighbours keep `gap` px between them: the
 * smallest n of 1, 2, 4, 8, … for which `n` grid steps of `stepPx` px are wide
 * enough for the widest label. Halving keeps the labels on round multiples.
 */
export function labelStride(
  stepPx: number,
  widestPx: number,
  gap: number,
): number {
  let stride = 1;
  while (stride < 64 && stride * stepPx < widestPx + gap) {
    stride *= 2;
  }
  return stride;
}
