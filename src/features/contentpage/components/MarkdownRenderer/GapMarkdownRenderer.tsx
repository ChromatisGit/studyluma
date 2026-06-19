"use client";

import { createContext, useContext, type ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
import * as prod from "react/jsx-runtime";
import { Highlight } from "prism-react-renderer";
import { visit } from "unist-util-visit";
import {
  type MarkdownNode,
  setHName,
  replaceWithText,
  isUnderlineStrong,
  CodeBlock,
} from "./remarkTransforms";
import { codeTheme } from "./codeTheme";
import { InlineMath, BlockMath } from "./TypstMath";

// ── Context ──────────────────────────────────────────────────────────

type GapRenderFn = (gapIndex: number, isInCodeBlock: boolean) => ReactNode;

const GapRenderContext = createContext<GapRenderFn | null>(null);

export function GapRenderProvider({
  renderGap,
  children,
}: {
  renderGap: GapRenderFn;
  children: ReactNode;
}) {
  return (
    <GapRenderContext.Provider value={renderGap}>
      {children}
    </GapRenderContext.Provider>
  );
}

function useGapRender(): GapRenderFn {
  const ctx = useContext(GapRenderContext);
  if (!ctx) throw new Error("GapSlot must be used within GapRenderProvider");
  return ctx;
}

// ── Components mapped by rehype-react ────────────────────────────────

function GapSlot({ gapIndex }: { gapIndex: number }) {
  const renderGap = useGapRender();
  return <>{renderGap(gapIndex, false)}</>;
}

function CodeBlockWithGaps({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  const renderGap = useGapRender();
  const GAP_SPLIT = /\uFFFE(\d+)\uFFFE/;

  // Split code into alternating [text, gapIndex, text, gapIndex, ...] segments
  const segments = code.split(GAP_SPLIT);

  return (
    <pre className="content-code-block">
      {segments.map((segment, i) => {
        if (i % 2 === 1) {
          // Odd indices are captured gap index strings
          return (
            <span key={i}>{renderGap(Number(segment), true)}</span>
          );
        }
        // Even indices are code text — highlight with Prism
        if (!segment) return null;
        return (
          <Highlight
            key={i}
            theme={codeTheme}
            code={segment}
            language={language as Parameters<typeof Highlight>[0]["language"]}
          >
            {({ tokens, getTokenProps }) =>
              tokens.map((line, lineIdx) => (
                <span key={lineIdx}>
                  {lineIdx > 0 && "\n"}
                  {line.map((token, tokenIdx) => (
                    <span key={tokenIdx} {...getTokenProps({ token })} />
                  ))}
                </span>
              ))
            }
          </Highlight>
        );
      })}
    </pre>
  );
}

// ── Custom remark plugin: gap sentinels → AST nodes ──────────────────

const GAP_SENTINEL_REGEX = /\uFFFE(\d+)\uFFFE/;

/** Splits a leaf node's text value around gap sentinels, replacing it in its
 *  parent's children with alternating same-type segments and GapSlot placeholders.
 *  Used for text/inlineCode/math/inlineMath - a `((...))` gap can land inside any
 *  of these (e.g. a gap inside a `$$...$$` block written by the content author). */
function splitNodeBySentinel(
  node: MarkdownNode,
  index: number | undefined,
  parent: MarkdownNode | undefined,
  segmentType: string
): number | undefined {
  const children = parent?.children;
  if (!children || index == null || !node.value) return;
  if (!GAP_SENTINEL_REGEX.test(node.value)) return;

  const parts: MarkdownNode[] = [];
  let remaining = node.value;

  while (remaining) {
    const match = GAP_SENTINEL_REGEX.exec(remaining);
    if (!match) {
      if (remaining) parts.push({ type: segmentType, value: remaining });
      break;
    }

    const before = remaining.slice(0, match.index);
    if (before) parts.push({ type: segmentType, value: before });

    parts.push({
      type: "gapPlaceholder",
      data: {
        hName: "GapSlot",
        hProperties: { gapIndex: Number(match[1]) },
      },
    });

    remaining = remaining.slice(match.index + match[0].length);
  }

  if (parts.length > 0) {
    children.splice(index, 1, ...parts);
    return index;
  }
}

function remarkGapPlaceholders() {
  return (tree: MarkdownNode) => {
    // Handle gap sentinels inside code blocks (fenced code)
    visit(tree, "code", (node: MarkdownNode) => {
      const value = node.value ?? "";
      if (GAP_SENTINEL_REGEX.test(value)) {
        setHName(node, "CodeBlockWithGaps", {
          code: value,
          language: node.lang ?? "text",
        });
      }
    });

    // Handle gap sentinels in inline code, text, and math nodes - remarkMath has
    // already run by this point, so a gap sentinel inside `$...$`/`$$...$$` shows
    // up as the value of a "math"/"inlineMath" node, not a "text" node. A "math"
    // (block) node that contains a gap must split into "inlineMath" fragments,
    // not "math" ones - once a gap sits next to it, the fragment needs to flow
    // inline on the same line as the gap field rather than render as its own
    // full-width centered block row.
    visit(tree, "inlineCode", (node, index, parent) =>
      splitNodeBySentinel(node, index, parent, "inlineCode")
    );
    visit(tree, "text", (node, index, parent) =>
      splitNodeBySentinel(node, index, parent, "text")
    );
    visit(tree, "math", (node, index, parent) =>
      splitNodeBySentinel(node, index, parent, "inlineMath")
    );
    visit(tree, "inlineMath", (node, index, parent) =>
      splitNodeBySentinel(node, index, parent, "inlineMath")
    );
  };
}

// ── Remark transforms (same as standard, but code blocks handled by gap plugin) ──

function remarkGapMarkdownTransforms() {
  return (tree: MarkdownNode, file: { value?: unknown }) => {
    const source = typeof file.value === "string" ? file.value : "";

    visit(tree, (node: MarkdownNode) => {
      switch (node.type) {
        case "heading":
          setHName(node, "p");
          break;
        case "strong":
          if (isUnderlineStrong(node, source)) {
            setHName(node, "span", { className: "content-underline" });
          }
          break;
        case "inlineMath":
          setHName(node, "InlineMath", { math: node.value ?? "" });
          break;
        case "math":
          setHName(node, "BlockMath", { math: node.value ?? "" });
          break;
        case "code":
          // Only set CodeBlock if not already handled by remarkGapPlaceholders
          if (!node.data?.hName) {
            setHName(node, "CodeBlock", {
              code: node.value ?? "",
              language: node.lang ?? "text",
            });
          }
          break;
        case "link":
          setHName(node, "a", {
            href: node.url,
            target: "_blank",
            rel: "noreferrer",
          });
          break;
        case "image":
          replaceWithText(node, node.alt ?? "");
          break;
        case "break":
          setHName(node, "br");
          delete node.children;
          break;
        case "table":
        case "tableRow":
        case "tableCell":
          break;
        case "html":
          replaceWithText(node, "");
          break;
        default:
          break;
      }
    });
  };
}

// ── Processor ────────────────────────────────────────────────────────

const gapProcessor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkGapPlaceholders)
  .use(remarkGapMarkdownTransforms)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeReact, {
    Fragment: prod.Fragment,
    jsx: prod.jsx,
    jsxs: prod.jsxs,
    components: {
      InlineMath,
      BlockMath,
      CodeBlock,
      CodeBlockWithGaps,
      GapSlot,
    },
  });

// ── Public component ─────────────────────────────────────────────────

interface GapMarkdownRendererProps {
  markdown: string;
}

export function GapMarkdownRenderer({
  markdown,
}: GapMarkdownRendererProps): ReactNode {
  const rendered = gapProcessor.processSync(markdown).result as ReactNode;
  return <div className="content-markdown">{rendered}</div>;
}
