import type { Parent } from "unist";
import { SKIP, visit } from "unist-util-visit";

/** The mdast node shape the plugins below work on. */
export type MarkdownNode = {
  type: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  alt?: string | null;
  url?: string;
  depth?: number;
  name?: string;
  attributes?: Record<string, string | null | undefined> | null;
  children?: MarkdownNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
};

export function setHName(
  node: MarkdownNode,
  hName: string,
  hProperties?: Record<string, unknown>,
) {
  const data = node.data ?? {};
  data.hName = hName;
  if (hProperties) {
    data.hProperties = { ...(data.hProperties ?? {}), ...hProperties };
  }
  node.data = data;
}

function textOf(node: MarkdownNode): string {
  if (typeof node.value === "string") {
    return node.value;
  }
  return (node.children ?? []).map(textOf).join("");
}

const isDirective = (node: MarkdownNode) =>
  node.type === "leafDirective" ||
  node.type === "containerDirective" ||
  node.type === "textDirective";

/**
 * A formula alone in its paragraph is set as a display formula, in
 * worksheets, summaries and lesson frames alike.
 */
export function remarkDisplayFormula() {
  return (tree: MarkdownNode) => {
    visit(tree, "paragraph", (node: MarkdownNode) => {
      const content = (node.children ?? []).filter(
        (child) => !(child.type === "text" && !child.value?.trim()),
      );
      const [only] = content;
      if (content.length === 1 && only?.type === "inlineMath") {
        node.type = "math";
        node.value = only.value ?? "";
        delete node.children;
      }
    });
  };
}

/**
 * Merkkarten are defined in a chapter summary as a marker:
 *
 *   ::merkkarte{#potenzregel title="Potenzregel"}
 *   Für $f(x) = x^n$ gilt …
 *
 *   ::beispiel
 *   $f(x) = x^3 => f'(x) = 3x^2$
 *
 * The card reaches to the next marker or heading; a following `::beispiel`
 * belongs to it. Runs of two or more cards become one grid.
 */
export function remarkMerkkarten() {
  return (tree: MarkdownNode) => {
    const children = tree.children ?? [];
    const out: MarkdownNode[] = [];
    let card: MarkdownNode | undefined;
    let example: MarkdownNode | undefined;
    for (const child of children) {
      const isCardMarker =
        child.type === "leafDirective" && child.name === "merkkarte";
      if (isCardMarker) {
        card = {
          type: "merkkarte",
          data: {
            hName: "Merkkarte",
            hProperties: {
              id: child.attributes?.id ?? undefined,
              title: child.attributes?.title ?? "",
            },
          },
          children: [],
        };
        example = undefined;
        out.push(card);
        continue;
      }
      if (card && child.type === "leafDirective" && child.name === "beispiel") {
        example = {
          type: "merkkarteBeispiel",
          data: { hName: "MerkkarteBeispiel" },
          children: [],
        };
        card.children?.push(example);
        continue;
      }
      if (child.type === "heading" || isDirective(child)) {
        card = undefined;
        example = undefined;
      }
      (example ?? card)?.children?.push(child);
      if (!card) {
        out.push(child);
      }
    }
    tree.children = groupCards(out);
  };
}

function groupCards(nodes: MarkdownNode[]): MarkdownNode[] {
  const grouped: MarkdownNode[] = [];
  let run: MarkdownNode[] = [];
  const flush = () => {
    if (run.length > 1) {
      grouped.push({
        type: "merkkartenGruppe",
        data: {
          hName: "div",
          hProperties: { className: ["merkkarten-gruppe"] },
        },
        children: run,
      });
    } else {
      grouped.push(...run);
    }
    run = [];
  };
  for (const node of nodes) {
    if (node.type === "merkkarte") {
      run.push(node);
    } else {
      flush();
      grouped.push(node);
    }
  }
  flush();
  return grouped;
}

/** Directives nobody handled stay readable: "Hinweis:Text" remains text. */
export function remarkDirectiveFallback() {
  return (tree: MarkdownNode) => {
    visit(tree, (node: MarkdownNode) => {
      if (node.type === "containerDirective") {
        setHName(node, "div");
        return undefined;
      }
      if (node.type === "leafDirective" || node.type === "textDirective") {
        const marker = node.type === "textDirective" ? ":" : "::";
        const label = node.children?.length ? `[${textOf(node)}]` : "";
        node.type = "text";
        node.value = `${marker}${node.name ?? ""}${label}`;
        delete node.children;
        return SKIP;
      }
      return undefined;
    });
  };
}

/** `==text==` is a highlighter mark. */
export function remarkHighlight() {
  return (tree: MarkdownNode) => {
    visit(
      tree,
      "text",
      (
        node: MarkdownNode,
        index: number | undefined,
        parent: Parent | undefined,
      ) => {
        const value = node.value ?? "";
        if (!parent || index === undefined || !value.includes("==")) {
          return undefined;
        }
        const parts = value.split(/==([^=\n]+)==/g);
        if (parts.length === 1) {
          return undefined;
        }
        const replacement = parts.flatMap((part, i): MarkdownNode[] => {
          if (!part) {
            return [];
          }
          return i % 2 === 0
            ? [{ type: "text", value: part }]
            : [
                {
                  type: "mark",
                  data: { hName: "mark" },
                  children: [{ type: "text", value: part }],
                },
              ];
        });
        parent.children.splice(index, 1, ...(replacement as never[]));
        return index + replacement.length;
      },
    );
  };
}

const GAP = /￾(\d+)￾/;

/** Gap placeholders `￾<index>￾` in text become gap slots. */
export function remarkGaps() {
  return (tree: MarkdownNode) => {
    visit(
      tree,
      "text",
      (
        node: MarkdownNode,
        index: number | undefined,
        parent: Parent | undefined,
      ) => {
        const value = node.value ?? "";
        if (!parent || index === undefined || !GAP.test(value)) {
          return undefined;
        }
        const replacement = value
          .split(GAP)
          .flatMap((part, i): MarkdownNode[] => {
            if (i % 2 === 1) {
              return [
                {
                  type: "gap",
                  data: {
                    hName: "GapSlot",
                    hProperties: { index: Number(part) },
                  },
                },
              ];
            }
            return part ? [{ type: "text", value: part }] : [];
          });
        parent.children.splice(index, 1, ...(replacement as never[]));
        return index + replacement.length;
      },
    );
  };
}

export type TransformOptions = {
  /**
   * Keep headings and shift them down by this many levels (a summary below
   * the page's own h2 uses 1, so `##` renders as h3). Without it, headings
   * render as bold paragraphs.
   */
  headingOffset?: number | undefined;
};

/** Maps Markdown nodes onto the components the renderer provides. */
export function remarkTransforms(options: TransformOptions = {}) {
  const { headingOffset } = options;
  return (tree: MarkdownNode) => {
    visit(tree, (node: MarkdownNode) => {
      switch (node.type) {
        case "heading":
          if (headingOffset === undefined) {
            setHName(node, "p", { className: ["md-heading"] });
          } else {
            const level = Math.min(
              6,
              Math.max(2, (node.depth ?? 2) + headingOffset),
            );
            setHName(node, `h${level}`, {
              className: [`h${Math.min(level, 4)}`],
            });
          }
          break;
        case "inlineMath":
          setHName(node, "InlineMath", { math: node.value ?? "" });
          break;
        case "math":
          setHName(node, "BlockMath", { math: node.value ?? "" });
          break;
        case "code":
          setHName(node, "CodeBlock", {
            code: node.value ?? "",
            language: node.lang ?? "text",
            copy: /\bcopy\b/.test(node.meta ?? ""),
          });
          break;
        case "table":
          setHName(node, "MarkdownTable");
          break;
        case "link": {
          const external = /^https?:/.test(node.url ?? "");
          setHName(node, "a", {
            href: node.url,
            ...(external ? { target: "_blank", rel: "noreferrer" } : {}),
          });
          break;
        }
        case "html":
          node.type = "text";
          node.value = "";
          break;
        default:
          break;
      }
    });
  };
}

/** A lone paragraph loses its `<p>`, for labels and other inline text. */
export function remarkUnwrapParagraph() {
  return (tree: MarkdownNode) => {
    const [only] = tree.children ?? [];
    if (tree.children?.length === 1 && only?.type === "paragraph") {
      tree.children = only.children ?? [];
    }
  };
}
