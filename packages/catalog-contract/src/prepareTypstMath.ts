/**
 * Prepares Typst math for kern-typ, which renders MathML but differs from
 * Typst in a few places:
 *
 * - `a/b` must bind like Typst: the operands are single atoms (number,
 *   identifier, call, group, each with attached `^`, `_` and primes), and
 *   parentheses around an operand disappear. kern-typ would read
 *   `1/2500 x^4` as `1/(2500 x^4)` and keep the parentheses in `(a+b)/c`.
 * - A bare colon is rejected; the ratio sign looks the same.
 * - `dot` is the multiplication dot in Typst; kern-typ needs `dot.op`.
 */
export function prepareTypstMath(source: string): string {
  return rewrite(source)
    .replace(/:/g, "∶")
    .replace(/\bdot\b(?!\.)/g, "dot.op");
}

const OPEN: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

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
