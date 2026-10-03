/**
 * The math editor's structure: a row of characters and boxes. The editor
 * stores exactly what the checker evaluates, so there is no second parser
 * between input and checking.
 */
export type MathChar = { t: "c"; v: string };
export type MathFrac = { t: "frac"; n: MathRow; d: MathRow };
export type MathSqrt = { t: "sqrt"; b: MathRow };
export type MathSup = { t: "sup"; e: MathRow };
export type MathNode = MathChar | MathFrac | MathSqrt | MathSup;
export type MathRow = MathNode[];

/** The child rows of a box, in cursor order. */
export const boxKeys = {
  frac: ["n", "d"],
  sqrt: ["b"],
  sup: ["e"],
} as const;

export function childRows(node: MathNode): MathRow[] {
  switch (node.t) {
    case "frac":
      return [node.n, node.d];
    case "sqrt":
      return [node.b];
    case "sup":
      return [node.e];
    default:
      return [];
  }
}

export const isBox = (
  node: MathNode | undefined,
): node is Exclude<MathNode, MathChar> => !!node && node.t !== "c";

export const char = (v: string): MathChar => ({ t: "c", v });

export function cloneRow(row: MathRow): MathRow {
  return row.map((node): MathNode => {
    switch (node.t) {
      case "frac":
        return { t: "frac", n: cloneRow(node.n), d: cloneRow(node.d) };
      case "sqrt":
        return { t: "sqrt", b: cloneRow(node.b) };
      case "sup":
        return { t: "sup", e: cloneRow(node.e) };
      default:
        return { t: "c", v: node.v };
    }
  });
}

export function isMathRow(value: unknown): value is MathRow {
  return (
    Array.isArray(value) &&
    value.every((node) => typeof node === "object" && node && "t" in node)
  );
}

/** A solution set is one row; ";" at the top level separates the solutions. */
export function splitTop(row: MathRow): MathRow[] {
  const out: MathRow[] = [[]];
  for (const node of row) {
    if (node.t === "c" && node.v === ";") {
      out.push([]);
    } else {
      out.at(-1)?.push(node);
    }
  }
  return out;
}
