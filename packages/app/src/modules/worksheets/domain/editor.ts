import {
  char,
  childRows,
  isBox,
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
      if (isBox(previous)) {
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
      if (isBox(next)) {
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
    this.cursor = { row, i: Math.max(0, Math.min(i, row.length)) };
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
}

/** A spoken form for screen readers: "12 mal x hoch 3". */
export function speak(row: MathRow | undefined, words: SpeechWords): string {
  if (!row?.length) {
    return words.empty;
  }
  const out: string[] = [];
  for (let i = 0; i < row.length; i++) {
    const node = row[i] as MathNode;
    if (node.t === "c" && /[0-9,]/.test(node.v)) {
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
      const only = node.e[0];
      out.push(
        node.e.length === 1 && only?.t === "c" && only.v === "2"
          ? words.squared
          : words.power(speak(node.e, words)),
      );
    }
  }
  return out.join(" ");
}
