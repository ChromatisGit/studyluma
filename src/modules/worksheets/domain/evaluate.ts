import type { MathRow } from "./mathNodes";

/** The value tree of an entered row. */
export type Ast =
  | { k: "num"; v: number; dec: boolean; places: number }
  | { k: "pi" | "e" }
  | { k: "var"; v: string }
  | { k: "neg" | "paren" | "sqrt" | "pct"; a: Ast }
  | { k: "frac" | "pow"; a: Ast; b: Ast }
  | { k: "bin"; op: "+" | "−" | "·" | "÷"; a: Ast; b: Ast; implicit?: boolean };

type Lexeme =
  | { k: "num"; s: string }
  | { k: "pi" | "e" }
  | { k: "var" | "op"; v: string }
  | { k: "frac" | "sqrt" | "sup"; rows: MathRow[] };

export class ParseError extends Error {}

function lex(row: MathRow): Lexeme[] {
  const out: Lexeme[] = [];
  for (let i = 0; i < row.length; i++) {
    const node = row[i];
    if (!node) {
      continue;
    }
    if (node.t === "frac") {
      out.push({ k: "frac", rows: [node.n, node.d] });
      continue;
    }
    if (node.t === "sqrt") {
      out.push({ k: "sqrt", rows: [node.b] });
      continue;
    }
    if (node.t === "sup") {
      out.push({ k: "sup", rows: [node.e] });
      continue;
    }
    const v = node.v;
    if (/[0-9,.]/.test(v)) {
      let s = v;
      for (
        let next = row[i + 1];
        next?.t === "c" && /[0-9,.]/.test(next.v);
        next = row[i + 1]
      ) {
        s += next.v;
        i++;
      }
      out.push({ k: "num", s: s.replace(/\./g, ",") });
    } else if (v === "π") {
      out.push({ k: "pi" });
    } else if (v === "e") {
      out.push({ k: "e" });
    } else if (/\p{L}/u.test(v)) {
      out.push({ k: "var", v });
    } else {
      const op =
        v === "-" ? "−" : v === "*" || v === "×" ? "·" : v === "/" ? "÷" : v;
      out.push({ k: "op", v: op });
    }
  }
  return out;
}

function numberAst(text: string): Ast {
  if (/^,|,$|,.*,/.test(text)) {
    throw new ParseError("number");
  }
  const [, fraction = ""] = text.split(",");
  return {
    k: "num",
    v: Number.parseFloat(text.replace(",", ".")),
    dec: text.includes(","),
    places: fraction.length,
  };
}

/** Recursive descent over the lexemes of one row. */
class RowParser {
  private p = 0;

  constructor(private readonly tokens: Lexeme[]) {}

  private isOp(v: string) {
    const token = this.tokens[this.p];
    return token?.k === "op" && token.v === v;
  }

  private startsPrimary() {
    const token = this.tokens[this.p];
    return (
      !!token && (token.k !== "op" || token.v === "(") && token.k !== "sup"
    );
  }

  private box(rows: MathRow[], index: number): Ast {
    const inner = rows[index] ?? [];
    if (!inner.length) {
      throw new ParseError("empty box");
    }
    return parseRow(inner);
  }

  parse(): Ast {
    if (!this.tokens.length) {
      throw new ParseError("empty");
    }
    const result = this.expression();
    if (this.p < this.tokens.length) {
      throw new ParseError("rest");
    }
    return result;
  }

  private expression(): Ast {
    let a = this.term();
    while (this.isOp("+") || this.isOp("−")) {
      const op = (this.tokens[this.p++] as { v: "+" | "−" }).v;
      a = { k: "bin", op, a, b: this.term() };
    }
    return a;
  }

  private term(): Ast {
    let a = this.unary();
    for (;;) {
      if (this.isOp("·") || this.isOp("÷")) {
        const op = (this.tokens[this.p++] as { v: "·" | "÷" }).v;
        a = { k: "bin", op, a, b: this.unary() };
      } else if (this.startsPrimary()) {
        a = { k: "bin", op: "·", a, b: this.unary(), implicit: true };
      } else {
        return a;
      }
    }
  }

  private unary(): Ast {
    if (this.isOp("−")) {
      this.p++;
      return { k: "neg", a: this.unary() };
    }
    if (this.isOp("+")) {
      this.p++;
      return this.unary();
    }
    let base = this.primary();
    for (
      let token = this.tokens[this.p];
      token?.k === "sup";
      token = this.tokens[this.p]
    ) {
      this.p++;
      base = { k: "pow", a: base, b: this.box(token.rows, 0) };
    }
    while (this.isOp("%")) {
      this.p++;
      base = { k: "pct", a: base };
    }
    return base;
  }

  private primary(): Ast {
    const token = this.tokens[this.p++];
    if (!token) {
      throw new ParseError("unexpected end");
    }
    switch (token.k) {
      case "num":
        return numberAst(token.s);
      case "pi":
      case "e":
        return { k: token.k };
      case "var":
        return { k: "var", v: token.v };
      case "frac":
        return {
          k: "frac",
          a: this.box(token.rows, 0),
          b: this.box(token.rows, 1),
        };
      case "sqrt":
        return { k: "sqrt", a: this.box(token.rows, 0) };
      case "op":
        if (token.v === "(") {
          const inner = this.expression();
          if (!this.isOp(")")) {
            throw new ParseError("bracket");
          }
          this.p++;
          return { k: "paren", a: inner };
        }
        throw new ParseError("unexpected operator");
      default:
        throw new ParseError("unexpected");
    }
  }
}

/** Parses an entered row with the usual precedence; implicit `2x` is a product. */
export function parseRow(row: MathRow): Ast {
  return new RowParser(lex(row)).parse();
}

export function tryParse(row: MathRow): Ast | null {
  try {
    return parseRow(row);
  } catch {
    return null;
  }
}

export function evaluate(node: Ast, env: Record<string, number> = {}): number {
  switch (node.k) {
    case "num":
      return node.v;
    case "pi":
      return Math.PI;
    case "e":
      return Math.E;
    case "pct":
      return evaluate(node.a, env) / 100;
    case "var":
      return env[node.v] ?? Number.NaN;
    case "paren":
      return evaluate(node.a, env);
    case "neg":
      return -evaluate(node.a, env);
    case "sqrt":
      return Math.sqrt(evaluate(node.a, env));
    case "frac":
      return evaluate(node.a, env) / evaluate(node.b, env);
    case "pow":
      return evaluate(node.a, env) ** evaluate(node.b, env);
    case "bin": {
      const a = evaluate(node.a, env);
      const b = evaluate(node.b, env);
      if (node.op === "+") {
        return a + b;
      }
      if (node.op === "−") {
        return a - b;
      }
      return node.op === "·" ? a * b : a / b;
    }
  }
}

function children(node: Ast): Ast[] {
  if ("a" in node) {
    return "b" in node ? [node.a, node.b] : [node.a];
  }
  return [];
}

const isPlain = (node: Ast): boolean =>
  node.k === "num" ||
  ((node.k === "neg" || node.k === "paren") && isPlain(node.a));

const isInteger = (node: Ast): node is Extract<Ast, { k: "num" }> =>
  node.k === "num" && !node.dec && Number.isInteger(node.v);

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

function leadingCoefficient(node: Ast): number | null {
  if (isInteger(node)) {
    return node.v;
  }
  return node.k === "bin" && node.op === "·"
    ? leadingCoefficient(node.a)
    : null;
}

/**
 * Still arithmetic between plain numbers (`3 · 4`, `6π/2`) or a reducible
 * fraction: the value is right, but the result isn't simplified.
 */
export function unsimplified(node: Ast): boolean {
  if (node.k === "bin" && isPlain(node.a) && isPlain(node.b)) {
    return true;
  }
  if (
    node.k === "bin" &&
    node.op === "·" &&
    node.a.k === "bin" &&
    node.a.op === "·" &&
    isPlain(node.a.b) &&
    isPlain(node.b)
  ) {
    return true;
  }
  if (node.k === "frac" && isInteger(node.b)) {
    const coefficient = leadingCoefficient(node.a);
    if (
      node.b.v === 1 ||
      (coefficient !== null && gcd(coefficient, node.b.v) > 1)
    ) {
      return true;
    }
  }
  return children(node).some(unsimplified);
}

export const hasDecimal = (node: Ast): boolean =>
  (node.k === "num" && node.dec) || children(node).some(hasDecimal);

/** The most decimal places of any number in the entry. */
export function decimalPlaces(node: Ast): number {
  const own = node.k === "num" ? node.places : 0;
  return Math.max(own, ...children(node).map(decimalPlaces));
}

export const relativelyEqual = (a: number, b: number) =>
  Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
