import type { MathRow } from "./mathNodes";

/** A compiled Grafik file (`::grafik`); curves are rows evaluated in x and the parameters. */
export type Graphic = {
  axes: { x: [number, number]; y: [number, number] };
  graphs: { source: string; row: MathRow; name?: string }[];
  points: { position: [number, number]; name?: string }[];
  parameters: {
    name: string;
    from: number;
    to: number;
    step: number;
    start: number;
  }[];
  /** Makes the Grafik the workspace of a Graph task. */
  input?: { type: "function"; count: number };
};

export type RichInline =
  | { type: "text" | "code"; value: string }
  | { type: "strong" | "emphasis" | "highlight"; children: RichInline[] }
  | { type: "math"; source: string; display: string }
  | { type: "link"; url: string; children: RichInline[] }
  | { type: "image"; assetId: string; alt: string; fit: "contain" | "cover" }
  | {
      type: "gap";
      id: string;
      choices: string[];
      inputKind?: "dropdown" | "math" | "text";
      answer?: unknown;
    }
  | { type: "merkkarteRef"; targetId: string; title: string };

export type RichNode =
  | { type: "paragraph" | "heading"; children: RichInline[]; depth?: number }
  | { type: "list"; ordered: boolean; items: RichNode[][] }
  | { type: "table"; rows: RichInline[][][] }
  | { type: "code"; value: string; language?: string }
  | { type: "math"; source: string; display: string }
  | { type: "writingArea"; label?: string }
  | { type: "graphic"; title: string; graphic: Graphic };

export type GapNode = Extract<RichInline, { type: "gap" }>;

/** Calls `visit` for every inline node, depth first, in reading order. */
export function walkInlines(
  nodes: readonly RichNode[],
  visit: (inline: RichInline) => void,
): void {
  const inlines = (list: readonly RichInline[]) => {
    for (const node of list) {
      visit(node);
      if ("children" in node) {
        inlines(node.children);
      }
    }
  };
  for (const node of nodes) {
    if (node.type === "paragraph" || node.type === "heading") {
      inlines(node.children);
    } else if (node.type === "list") {
      node.items.forEach((item) => walkInlines(item, visit));
    } else if (node.type === "table") {
      node.rows.flat().forEach(inlines);
    }
  }
}

/** The gaps of rich content in reading order. */
export function gapsOf(nodes: readonly RichNode[]): GapNode[] {
  const gaps: GapNode[] = [];
  walkInlines(nodes, (node) => {
    if (node.type === "gap") {
      gaps.push(node);
    }
  });
  return gaps;
}

/** The Grafik that is the workspace of a Graph task, if the content has one. */
export function inputGraphicOf(
  nodes: readonly RichNode[],
): { title: string; graphic: Graphic } | undefined {
  for (const node of nodes) {
    if (node.type === "graphic" && node.graphic.input) {
      return node;
    }
  }
  return undefined;
}
