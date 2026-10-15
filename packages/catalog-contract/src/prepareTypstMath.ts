/**
 * Prepares Typst math for kern-typ, which renders MathML but differs from
 * Typst in a few places:
 *
 * - A comma between digits (`0,5`) is the German decimal comma and becomes a
 *   decimal point. Inside function calls, vectors and sets (`f(1,2)`,
 *   `{1,5}`) it still separates.
 * - `a/b` must bind like Typst: the operands are single atoms (number,
 *   identifier, call, group, each with attached `^`, `_` and primes), and
 *   parentheses around an operand disappear. kern-typ would read
 *   `1/2500 x^4` as `1/(2500 x^4)` and keep the parentheses in `(a+b)/c`.
 * - A bare colon is rejected; the ratio sign looks the same.
 * - `*` is typed for multiplication; it is shown as the same dot.
 */
export function prepareTypstMath(source: string): string {
  return rewrite(decimalCommas(source))
    .replace(/:/g, "∶")
    .replace(
      /("[^"]*")|\s*\*\s*/g,
      (whole, text?: string) => text ?? " dot.op ",
    );
}

const OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/** `0,5` → `0.5`, except where a comma separates arguments or elements. */
export function decimalCommas(source: string): string {
  if (!source.includes(",")) {
    return source;
  }
  // true: a bracket whose commas separate (call arguments, vectors, sets).
  const separating: boolean[] = [];
  let out = "";
  for (let index = 0; index < source.length; index++) {
    const char = source[index] ?? "";
    if (char === '"') {
      const close = source.indexOf('"', index + 1);
      const end = close < 0 ? source.length : close + 1;
      out += source.slice(index, end);
      index = end - 1;
      continue;
    }
    if (OPEN[char]) {
      const call = /[\p{L}']/u.test(source[index - 1] ?? "");
      separating.push(char !== "(" || call);
    } else if (char === ")" || char === "]" || char === "}") {
      separating.pop();
    } else if (
      char === "," &&
      !separating.at(-1) &&
      /(?<![\d,.])\d+$/.test(out) &&
      /^\d+(?!\d|,\d)/.test(source.slice(index + 1))
    ) {
      out += ".";
      continue;
    }
    out += char;
  }
  return out;
}

/**
 * Splits a transformation `5x = 2x + 6 | -2x` into the equation and what is
 * done to both sides. An odd number of bars means the last one separates:
 * `|x + 3| = 5 | -5` has three, `|x + 3| = 5` has two and stays whole.
 */
export function splitOperation(
  source: string,
): { equation: string; operation: string } | null {
  let last = -1;
  let count = 0;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      const close = source.indexOf('"', index + 1);
      index = close < 0 ? source.length : close;
    } else if (char === "|" && !source.startsWith("|->", index)) {
      last = index;
      count++;
    }
  }
  if (count % 2 === 0) {
    return null;
  }
  const equation = source.slice(0, last).trim();
  const operation = source.slice(last + 1).trim();
  // A bar inside brackets belongs to the formula: `P(2 | 5)`, `{x | x > 2}`.
  return equation && operation && balanced(equation) && balanced(operation)
    ? { equation, operation }
    : null;
}

function balanced(source: string): boolean {
  const stack: string[] = [];
  for (let index = 0; index < source.length; index++) {
    const char = source[index] ?? "";
    if (char === '"') {
      const close = source.indexOf('"', index + 1);
      index = close < 0 ? source.length : close;
    } else if (OPEN[char]) {
      stack.push(OPEN[char]);
    } else if (")]}".includes(char) && stack.pop() !== char) {
      return false;
    }
  }
  return stack.length === 0;
}

/** kern-typ prints decimal points; German text uses the comma: 7.5 → 7,5. */
export function germanDecimals(mathml: string): string {
  return mathml.replace(
    /<mn>([^<]+)<\/mn>/g,
    (_, value: string) => `<mn>${value.replace(/(\d)\.(\d)/g, "$1,$2")}</mn>`,
  );
}

type Unit = { text: string; atom: boolean; group?: string };

/** Index after the bracket group that starts at `start`. */
function groupEnd(source: string, start: number): number {
  const stack: string[] = [];
  for (let index = start; index < source.length; index++) {
    const char = source[index] ?? "";
    if (char === '"') {
      const close = source.indexOf('"', index + 1);
      index = close < 0 ? source.length : close;
    } else if (OPEN[char]) {
      stack.push(OPEN[char]);
    } else if (char === stack.at(-1)) {
      stack.pop();
      if (stack.length === 0) {
        return index + 1;
      }
    }
  }
  return source.length;
}

function readPrimary(
  source: string,
  start: number,
): { end: number; group?: string } | null {
  const rest = source.slice(start);
  const char = source[start] ?? "";
  if (OPEN[char]) {
    const end = groupEnd(source, start);
    return { end, group: source.slice(start + 1, end - 1) };
  }
  if (char === '"') {
    const close = source.indexOf('"', start + 1);
    return { end: close < 0 ? source.length : close + 1 };
  }
  const number = /^\d+(?:\.\d+)?/.exec(rest);
  if (number) {
    return { end: start + number[0].length };
  }
  const identifier = /^[\p{L}]+(?:\.[\p{L}]+)*/u.exec(rest);
  if (identifier) {
    let end = start + identifier[0].length;
    // A call binds its arguments, also after primes: `f'(x)/2`.
    let call = end;
    while (source[call] === "'") {
      call++;
    }
    if (source[call] === "(") {
      end = groupEnd(source, call);
    }
    return { end };
  }
  return null;
}

/** Reads one atom with its attachments (`^`, `_`, primes, `!`). */
function readAtom(
  source: string,
  start: number,
): { end: number; group?: string } | null {
  const primary = readPrimary(source, start);
  if (!primary) {
    return null;
  }
  let end = primary.end;
  let attached = false;
  for (;;) {
    const char = source[end];
    if (char === "'" || char === "!") {
      end++;
      attached = true;
    } else if ((char === "^" || char === "_") && end + 1 < source.length) {
      const next = readPrimary(source, end + 1);
      if (!next) {
        break;
      }
      end = next.end;
      attached = true;
    } else {
      break;
    }
  }
  return attached ? { end } : primary;
}

function units(source: string): Unit[] {
  const result: Unit[] = [];
  let index = 0;
  while (index < source.length) {
    const atom = readAtom(source, index);
    if (atom && atom.end > index) {
      const unit: Unit = { text: source.slice(index, atom.end), atom: true };
      if (atom.group !== undefined) {
        unit.group = atom.group;
      }
      result.push(unit);
      index = atom.end;
    } else {
      result.push({ text: source[index] ?? "", atom: false });
      index++;
    }
  }
  return result;
}

/** Rewrites groups and call arguments recursively. */
function inner(unit: Unit): string {
  if (unit.group !== undefined) {
    const open = unit.text[0] ?? "";
    return `${open}${rewrite(unit.group)}${OPEN[open] ?? ""}`;
  }
  return unit.text.replace(/\(([^]*)\)/u, (whole) => {
    const start = unit.text.indexOf("(");
    return `(${rewrite(unit.text.slice(start + 1, start + whole.length - 1))})`;
  });
}

function operand(unit: Unit): string {
  if (unit.group !== undefined && unit.text.startsWith("(")) {
    return rewrite(unit.group);
  }
  return inner(unit);
}

function rewrite(source: string): string {
  if (!source.includes("/")) {
    return source;
  }
  const list = units(source);
  const out: string[] = [];
  let pending: string | null = null;
  for (let index = 0; index < list.length; index++) {
    const unit = list[index] as Unit;
    if (!unit.atom) {
      if (pending !== null) {
        out.push(pending);
        pending = null;
      }
      out.push(unit.text);
      continue;
    }
    let numerator = pending ?? operand(unit);
    let consumed = index;
    // Fold `a / b / c` left to right, allowing spaces around the slash.
    for (;;) {
      let look = consumed + 1;
      while (list[look]?.text === " ") {
        look++;
      }
      if (list[look]?.text !== "/") {
        break;
      }
      look++;
      while (list[look]?.text === " ") {
        look++;
      }
      const denominator = list[look];
      if (!denominator?.atom) {
        break;
      }
      numerator = `frac(${numerator}, ${operand(denominator)})`;
      consumed = look;
    }
    pending = null;
    out.push(
      consumed === index && numerator === operand(unit)
        ? inner(unit)
        : numerator,
    );
    index = consumed;
  }
  if (pending !== null) {
    out.push(pending);
  }
  return out.join("");
}
