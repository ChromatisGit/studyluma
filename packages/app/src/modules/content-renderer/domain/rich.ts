import type {
  Graphic,
  RichInline,
  RichNode,
} from "@studyluma/catalog-contract";

export type { Graphic, RichInline, RichNode };

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
