import { char, type MathNode, type MathRow } from "../../content-renderer";

/**
 * A small Typst math parser for expected answers (`12 x^3`, `sqrt(2)/2`,
 * `3 pi`). It turns them into editor rows, so expected and entered values
 * go through the same evaluator.
 */
type Token = { t: "num" | "id" | "text" | "op"; v: string };

const SYMBOLS: Record<string, string> = {
  pi: "π",
  dot: "·",
  "dot.op": "·",
  times: "×",
  "plus.minus": "±",
  approx: "≈",
  infinity: "∞",
};

const TWO: Record<string, string> = {
  "=>": "⇒",
  "->": "→",
  "<=": "≤",
  ">=": "≥",
  "!=": "≠",
};

function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i);
    const c = source[i] ?? "";
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const number = /^\d+(\.\d+)?/.exec(rest);
    if (number) {
      out.push({ t: "num", v: number[0] });
      i += number[0].length;
      continue;
    }
    const identifier = /^[A-Za-z]+(\.[A-Za-z]+)*/.exec(rest);
    if (identifier) {
      out.push({ t: "id", v: identifier[0] });
      i += identifier[0].length;
      continue;
    }
    if (c === '"') {
      const end = source.indexOf('"', i + 1);
      out.push({
        t: "text",
        v: source.slice(i + 1, end < 0 ? undefined : end),
      });
      i = end < 0 ? source.length : end + 1;
      continue;
    }
    const two = TWO[source.slice(i, i + 2)];
    if (two) {
      out.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    out.push({
      t: "op",
      v: c === "-" ? "−" : c === "*" ? "·" : c === "~" ? "≈" : c,
    });
    i++;
  }
  return out;
}

export type TypstTree =
  | { t: "row"; items: TypstTree[] }
  | { t: "num" | "id" | "sym" | "text" | "op"; v: string }
  | { t: "group"; open: string; close: string; items: TypstTree[] }
  | { t: "frac"; a: TypstTree; b: TypstTree }
  | { t: "sqrt"; a: TypstTree }
  | { t: "sup" | "sub"; base: TypstTree; e: TypstTree }
  | { t: "prime"; base: TypstTree };

const CLOSE: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
const EMPTY: TypstTree = { t: "row", items: [] };

export function parseTypst(source: string): TypstTree {
  const tokens = tokenize(source);
  let p = 0;
  const isOp = (v: string) => tokens[p]?.t === "op" && tokens[p]?.v === v;
  const strip = (node: TypstTree | null): TypstTree =>
    !node
      ? EMPTY
      : node.t === "group" && node.open === "("
        ? { t: "row", items: node.items }
        : node;

  function sequence(stop: string | null, commaStops = false): TypstTree[] {
    const items: TypstTree[] = [];
    while (p < tokens.length && !(stop && isOp(stop))) {
      if (commaStops && isOp(",")) {
        break;
      }
      let item = postfix();
      if (!item) {
        break;
      }
      while (isOp("/")) {
        p++;
        item = { t: "frac", a: strip(item), b: strip(postfix()) };
      }
      items.push(item);
    }
    return items;
  }

  function postfix(): TypstTree | null {
    let base = atom();
    if (!base) {
      return null;
    }
    for (;;) {
      if (isOp("^") || isOp("_")) {
        const kind = isOp("^") ? "sup" : "sub";
        p++;
        base = { t: kind, base, e: strip(atom()) };
      } else if (isOp("'")) {
        p++;
        base = { t: "prime", base };
      } else {
        return base;
      }
    }
  }

  function args(): TypstTree[] {
    const list: TypstTree[] = [];
    for (;;) {
      list.push({ t: "row", items: sequence(")", true) });
      if (isOp(",")) {
        p++;
        continue;
      }
      if (isOp(")")) {
        p++;
      }
      return list;
    }
  }

  function atom(): TypstTree | null {
    const token = tokens[p];
    if (!token) {
      return null;
    }
    p++;
    if (token.t === "num" || token.t === "text") {
      return { t: token.t, v: token.v };
    }
    if (token.t === "id") {
      if ((token.v === "sqrt" || token.v === "frac") && isOp("(")) {
        p++;
        const [a = EMPTY, b = EMPTY] = args();
        return token.v === "sqrt" ? { t: "sqrt", a } : { t: "frac", a, b };
      }
      const symbol = SYMBOLS[token.v];
      return symbol ? { t: "sym", v: symbol } : { t: "id", v: token.v };
    }
    const close = CLOSE[token.v];
    if (close) {
      const items = sequence(close);
      if (isOp(close)) {
        p++;
      }
      return { t: "group", open: token.v, close, items };
    }
    return { t: "op", v: token.v };
  }

  return { t: "row", items: sequence(null) };
}

function toNodes(node: TypstTree): MathRow {
  switch (node.t) {
    case "row":
      return node.items.flatMap(toNodes);
    case "num":
      return [...node.v.replace(".", ",")].map(char);
    case "id":
      return [...node.v].map(char);
    case "sym":
      return [char(node.v)];
    case "op":
      return [char(node.v === "/" ? "÷" : node.v)];
    case "group":
      return [char("("), ...node.items.flatMap(toNodes), char(")")];
    case "frac":
      return [{ t: "frac", n: toNodes(node.a), d: toNodes(node.b) }];
    case "sqrt":
      return [{ t: "sqrt", b: toNodes(node.a) }];
    case "sup":
      return [
        ...toNodes(node.base),
        { t: "sup", e: toNodes(node.e) } as MathNode,
      ];
    default:
      return [];
  }
}

/** Typst source → editor row, e.g. for expected answers and pasted text. */
export function typstToRow(source: string): MathRow {
  return toNodes(parseTypst(source));
}
