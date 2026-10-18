import {
  CHECK_POINTS,
  classifyLetterRun,
  typstToRow,
} from "@studyluma/catalog-contract";
import type { FunctionName, MathRow } from "@studyluma/catalog-contract";

/**
 * Evaluates a constant number written as Typst math, such as `pi/2`, `-2pi`,
 * `3 pi / 4` or `sqrt(2)`. The compiler cannot use the evaluator of the app
 * (the app is not a dependency of the compiler), and a Grafik only needs
 * numbers, π, `+ - * /`, powers, parentheses and square roots. For
 * `finitePoints` the same reader also knows x, e, `sin`, `cos` and `ln`.
 */
export function constantValue(
  source: string,
): { value: number } | { problem: string } {
  let row: MathRow;
  try {
    row = typstToRow(source);
  } catch {
    return { problem: `cannot read "${source}" as a number` };
  }
  try {
    const value = rowValue(row);
    return Number.isFinite(value)
      ? { value }
      : { problem: `"${source}" is not a finite number` };
  } catch (e) {
    return {
      problem:
        e instanceof Unreadable
          ? `cannot read "${source}" as a number (${e.message})`
          : `cannot read "${source}" as a number`,
    };
  }
}

/**
 * How many of the points where answers are compared a term in x is finite at,
 * or undefined if the term has no x or cannot be read (then nothing is known).
 */
export function finitePoints(row: MathRow): number | undefined {
  const at = { x: 0, used: false };
  try {
    const values = CHECK_POINTS.map((x) => {
      at.x = x;
      return rowValue(row, at);
    });
    return at.used ? values.filter(Number.isFinite).length : undefined;
  } catch (e) {
    if (e instanceof Unreadable) return undefined;
    throw e;
  }
}

class Unreadable extends Error {}

/** Where the variable x is read; `used` tells whether the term has an x. */
type Scope = { x: number; used: boolean };

const FUNCTIONS: Record<FunctionName, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  ln: Math.log,
};

type Token =
  | { k: "num"; v: number }
  | { k: "x" }
  | { k: "fn"; name: FunctionName; power?: MathRow }
  | { k: "op"; v: string }
  | { k: "box"; node: Exclude<MathRow[number], { t: "c" }> };

function tokens(row: MathRow, scope?: Scope): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < row.length; i++) {
    const node = row[i]!;
    if (node.t !== "c") {
      out.push({ k: "box", node });
    } else if (/[0-9,.]/.test(node.v)) {
      let text = node.v;
      for (
        let next = row[i + 1];
        next?.t === "c" && /[0-9,.]/.test(next.v);
        next = row[i + 1]
      ) {
        text += next.v;
        i++;
      }
      if (!/^\d+(?:[.,]\d+)?$/.test(text))
        throw new Unreadable(`"${text}" is not a number`);
      out.push({ k: "num", v: Number.parseFloat(text.replace(",", ".")) });
    } else if (node.v === "π") {
      out.push({ k: "num", v: Math.PI });
    } else if (/\p{L}/u.test(node.v)) {
      let word = node.v;
      for (
        let next = row[i + 1];
        next?.t === "c" && /\p{L}/u.test(next.v) && next.v !== "π";
        next = row[i + 1]
      ) {
        word += next.v;
        i++;
      }
      if (!scope) throw new Unreadable(`"${word}" is unknown`);
      const open = (n: MathRow[number] | undefined) =>
        n?.t === "c" && n.v === "(";
      const next = row[i + 1];
      const run = classifyLetterRun(
        word,
        open(next) || (next?.t === "sup" && open(row[i + 2])),
      );
      if (run.kind === "bare" || run.kind === "unsupported")
        throw new Unreadable(`"${word}" is unknown`);
      for (const letter of run.letters) {
        if (letter === "x") out.push({ k: "x" });
        else if (letter === "e") out.push({ k: "num", v: Math.E });
        else throw new Unreadable(`"${letter}" is unknown`);
      }
      if (run.kind === "call") {
        const power = next?.t === "sup" ? next.e : undefined;
        out.push({ k: "fn", name: run.name, ...(power ? { power } : {}) });
        if (power) i++;
      }
    } else if (node.v.trim()) {
      out.push({
        k: "op",
        v:
          node.v === "-"
            ? "−"
            : node.v === "*" || node.v === "×"
              ? "·"
              : node.v,
      });
    }
  }
  return out;
}

/** Recursive descent over one row; adjacent factors multiply (`2pi`, `3 pi`). */
function rowValue(row: MathRow, scope?: Scope): number {
  const list = tokens(row, scope);
  if (!list.length) throw new Unreadable("empty");
  let p = 0;
  const isOp = (v: string) => {
    const t = list[p];
    return t?.k === "op" && t.v === v;
  };
  const startsFactor = () => {
    const t = list[p];
    return !!t && (t.k !== "op" || t.v === "(") && !isSup(t);
  };
  const isSup = (t: Token) => t.k === "box" && t.node.t === "sup";
  const expression = (): number => {
    let a = term();
    while (isOp("+") || isOp("−")) {
      const plus = isOp("+");
      p++;
      const b = term();
      a = plus ? a + b : a - b;
    }
    return a;
  };
  const term = (): number => {
    let a = unary();
    for (;;) {
      if (isOp("·") || isOp("÷") || isOp("/")) {
        const times = isOp("·");
        p++;
        const b = unary();
        a = times ? a * b : a / b;
      } else if (startsFactor()) a *= unary();
      else return a;
    }
  };
  const unary = (): number => {
    if (isOp("−")) {
      p++;
      return -unary();
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    let base = primary();
    while (list[p] && isSup(list[p]!)) {
      const t = list[p++] as Extract<Token, { k: "box" }>;
      base = base ** rowValue((t.node as { e: MathRow }).e, scope);
    }
    return base;
  };
  const primary = (): number => {
    const t = list[p++];
    if (!t) throw new Unreadable("incomplete");
    if (t.k === "num") return t.v;
    if (t.k === "x") {
      scope!.used = true;
      return scope!.x;
    }
    if (t.k === "fn") {
      if (!isOp("(")) throw new Unreadable("missing (");
      p++;
      const call = FUNCTIONS[t.name](expression());
      if (!isOp(")")) throw new Unreadable("missing )");
      p++;
      return t.power ? call ** rowValue(t.power, scope) : call;
    }
    if (t.k === "op") {
      if (t.v !== "(") throw new Unreadable(`unexpected "${t.v}"`);
      const inner = expression();
      if (!isOp(")")) throw new Unreadable("missing )");
      p++;
      return inner;
    }
    if (t.node.t === "frac")
      return rowValue(t.node.n, scope) / rowValue(t.node.d, scope);
    if (t.node.t === "sqrt") return Math.sqrt(rowValue(t.node.b, scope));
    throw new Unreadable("unexpected exponent");
  };
  const value = expression();
  if (p < list.length) throw new Unreadable("unexpected rest");
  return value;
}
