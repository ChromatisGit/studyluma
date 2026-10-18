import {
  callHead,
  char,
  childRows,
  functionAt,
  isBox,
  type FunctionName,
  type MathNode,
  type MathRow,
} from "../../content-renderer";

export type Cursor = { row: MathRow; i: number };

const ATOM = /[0-9,a-zA-Zπ]/;
const isAtomChar = (node: MathNode | undefined) =>
  node?.t === "c" && ATOM.test(node.v);

/** The box that holds `row`, with the owner row and index of that box. */
function findParent(
  root: MathRow,
  row: MathRow,
): {
  node: Exclude<MathNode, { t: "c" }>;
  index: number;
  owner: MathRow;
  at: number;
} | null {
  for (let at = 0; at < root.length; at++) {
    const node = root[at];
    if (!isBox(node)) {
      continue;
    }
    const rows = childRows(node);
    for (let index = 0; index < rows.length; index++) {
      if (rows[index] === row) {
        return { node, index, owner: root, at };
      }
      const deeper = findParent(rows[index] as MathRow, row);
      if (deeper) {
        return deeper;
      }
    }
  }
  return null;
}

/**
 * A function name is one unit for the cursor and for deleting, as soon as
 * its `(` follows (typed or from the keypad): the cursor never rests inside
 * `sin`, and Backspace never leaves `si(` behind.
 *
 * - Left/right jump over the whole name.
 * - Backspace right after the name deletes it, with an exponent box that
 *   follows it (`sin|(x)` → `(x)`, `sin|²(x)` → `(x)`).
 * - Backspace right after its `(` removes name, `(` and the matching `)` and
 *   keeps the argument (`sin(|2x)` → `2x`, `sin(|)` → empty).
 * - Clicking inside a name puts the cursor at the nearer end.
 */
function nameEndingAt(row: MathRow, i: number) {
  const open = row[i]?.t === "sup" ? i + 1 : i;
  const head = callHead(row, open);
  return head?.end === i ? head : null;
}

/** The index of the `)` that closes the `(` before `from`, in the same row. */
function closingBracket(row: MathRow, from: number): number {
  let depth = 1;
  for (let k = from; k < row.length; k++) {
    const node = row[k];
    if (node?.t !== "c") {
      continue;
    }
    depth += node.v === "(" ? 1 : node.v === ")" ? -1 : 0;
    if (!depth) {
      return k;
    }
  }
  return -1;
}

const isEmptyBox = (node: MathNode) =>
  childRows(node).every((row) => !row.length);

/**
 * A calculator-like structured editor. It edits `root` in place and keeps a
 * cursor into one of its rows; callers store a clone after each edit.
 */
export class MathEditor {
  root: MathRow;
  cursor: Cursor;

  constructor(root: MathRow) {
    this.root = root;
    this.cursor = { row: root, i: root.length };
  }

  private insert(node: MathNode) {
    this.cursor.row.splice(this.cursor.i, 0, node);
    this.cursor.i++;
  }

  /** Types a character; `pi` and `sqrt` turn into π and a root. */
  char(v: string) {
    this.insert(char(v));
    const { row, i } = this.cursor;
    const word = row
      .slice(0, i)
      .map((node) => (node.t === "c" ? node.v : "\0"))
      .join("");
    if (/pi$/.test(word)) {
      row.splice(i - 2, 2, char("π"));
      this.cursor.i -= 1;
    } else if (/sqrt$/.test(word)) {
      row.splice(i - 4, 4);
      this.cursor.i -= 4;
      this.sqrt();
    }
  }

  /** A function: its name and brackets, the cursor between them. */
  fn(name: FunctionName) {
    this.insert(char(name[0] as string));
    for (const letter of name.slice(1)) {
      this.insert(char(letter));
    }
    this.insert(char("("));
    this.insert(char(")"));
    this.cursor.i--;
  }

  /** A fraction; typed `/` takes the preceding number or term as numerator. */
  frac(fromKeyboard = false) {
    const { row, i } = this.cursor;
    let start = i;
    if (fromKeyboard) {
      while (
        start > 0 &&
        (isBox(row[start - 1]) || isAtomChar(row[start - 1]))
      ) {
        start--;
      }
    }
    const numerator = row.splice(start, i - start);
    const node: MathNode = { t: "frac", n: numerator, d: [] };
    row.splice(start, 0, node);
    this.cursor = numerator.length
      ? { row: node.d, i: 0 }
      : { row: node.n, i: 0 };
  }

  sqrt() {
    const node: MathNode = { t: "sqrt", b: [] };
    this.insert(node);
    this.cursor = { row: node.b, i: 0 };
  }

  /** An exponent box; `squared` fills in 2 and keeps the cursor after it. */
  sup(squared = false) {
    const node: MathNode = { t: "sup", e: squared ? [char("2")] : [] };
    this.insert(node);
    if (!squared) {
      this.cursor = { row: node.e, i: 0 };
    }
  }

  /** `²`/`³` from the keyboard: a filled exponent, cursor after it. */
  power(digit: string) {
    this.insert({ t: "sup", e: [char(digit)] });
  }

  left() {
    const { row, i } = this.cursor;
    if (i > 0) {
      const previous = row[i - 1];
      const head = nameEndingAt(row, i);
      if (head) {
        this.cursor.i = head.start;
      } else if (isBox(previous)) {
        const last = childRows(previous).at(-1) as MathRow;
        this.cursor = { row: last, i: last.length };
      } else {
        this.cursor.i--;
      }
      return;
    }
    const parent = findParent(this.root, row);
    if (!parent) {
      return;
    }
    const rows = childRows(parent.node);
    const before = rows[parent.index - 1];
    this.cursor = before
      ? { row: before, i: before.length }
      : { row: parent.owner, i: parent.at };
  }

  right() {
    const { row, i } = this.cursor;
    if (i < row.length) {
      const next = row[i];
      const name = functionAt(row, i);
      if (name) {
        this.cursor.i = name.end;
      } else if (isBox(next)) {
        this.cursor = { row: childRows(next)[0] as MathRow, i: 0 };
      } else {
        this.cursor.i++;
      }
      return;
    }
    const parent = findParent(this.root, row);
    if (!parent) {
      return;
    }
    const after = childRows(parent.node)[parent.index + 1];
    this.cursor = after
      ? { row: after, i: 0 }
      : { row: parent.owner, i: parent.at + 1 };
  }

  back() {
    const { row, i } = this.cursor;
    if (i > 0) {
      const previous = row[i - 1] as MathNode;
      const name = nameEndingAt(row, i);
      if (name) {
        // An exponent box after the name belongs to the head and goes with it.
        const exponent = row[name.end]?.t === "sup" ? 1 : 0;
        row.splice(name.start, name.end - name.start + exponent);
        this.cursor.i = name.start;
        return;
      }
      const head = callHead(row, i - 1);
      if (head) {
        const close = closingBracket(row, i);
        if (close >= 0) {
          row.splice(close, 1);
        }
        row.splice(head.start, i - head.start);
        this.cursor.i = head.start;
        return;
      }
      if (isBox(previous) && !isEmptyBox(previous)) {
        this.left();
        return;
      }
      row.splice(i - 1, 1);
      this.cursor.i--;
      return;
    }
    const parent = findParent(this.root, row);
    if (!parent) {
      return;
    }
    if (isEmptyBox(parent.node)) {
      parent.owner.splice(parent.at, 1);
      this.cursor = { row: parent.owner, i: parent.at };
    } else if (
      parent.node.t === "frac" &&
      parent.index === 1 &&
      !parent.node.d.length
    ) {
      // "3/" then backspace unwraps the numerator again, like a calculator.
      const numerator = parent.node.n;
      parent.owner.splice(parent.at, 1, ...numerator);
      this.cursor = { row: parent.owner, i: parent.at + numerator.length };
    } else {
      this.cursor = { row: parent.owner, i: parent.at };
    }
  }

  /** Inserts structure, e.g. pasted text. */
  insertRow(nodes: MathRow) {
    this.cursor.row.splice(this.cursor.i, 0, ...nodes);
    this.cursor.i += nodes.length;
  }

  /** Places the cursor, e.g. where a formula was tapped. */
  place(row: MathRow, i: number) {
    const at = Math.max(0, Math.min(i, row.length));
    for (let start = at - 2; start < at; start++) {
      const name = start >= 0 ? functionAt(row, start) : null;
      if (name && name.end > at) {
        this.cursor = {
          row,
          i: at - start <= (name.end - start) / 2 ? start : name.end,
        };
        return;
      }
    }
    this.cursor = { row, i: at };
  }
}

/** Words for the spoken form of a value. */
export interface SpeechWords {
  empty: string;
  symbols: Record<string, string>;
  fraction: (numerator: string, denominator: string) => string;
  root: (radicand: string) => string;
  squared: string;
  power: (exponent: string) => string;
  /** The spoken names of sin, cos, ln, and the word that joins one to its argument. */
  functions: Record<FunctionName, string>;
  of: string;
}

/** A spoken form for screen readers: "12 mal x hoch 3". */
export function speak(row: MathRow | undefined, words: SpeechWords): string {
  if (!row?.length) {
    return words.empty;
  }
  const out: string[] = [];
  const exponent = (node: Extract<MathNode, { t: "sup" }>) => {
    const only = node.e[0];
    return node.e.length === 1 && only?.t === "c" && only.v === "2"
      ? words.squared
      : words.power(speak(node.e, words));
  };
  for (let i = 0; i < row.length; i++) {
    const node = row[i] as MathNode;
    const name = functionAt(row, i);
    if (name) {
      // "Sinus von", "Sinus Quadrat von": the name, its exponent, then the argument.
      out.push(words.functions[name.name]);
      i = name.end - 1;
      const next = row[i + 1];
      if (next?.t === "sup") {
        out.push(exponent(next));
        i++;
      }
      out.push(words.of);
    } else if (node.t === "c" && /[0-9,]/.test(node.v)) {
      let number = node.v;
      for (
        let next = row[i + 1];
        next?.t === "c" && /[0-9,]/.test(next.v);
        next = row[i + 1]
      ) {
        number += next.v;
        i++;
      }
      out.push(number);
    } else if (node.t === "c") {
      out.push(words.symbols[node.v] ?? node.v);
    } else if (node.t === "frac") {
      out.push(words.fraction(speak(node.n, words), speak(node.d, words)));
    } else if (node.t === "sqrt") {
      out.push(words.root(speak(node.b, words)));
    } else {
      out.push(exponent(node));
    }
  }
  return out.join(" ");
}
