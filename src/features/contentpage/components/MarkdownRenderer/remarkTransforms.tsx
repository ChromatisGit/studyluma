import type { ReactNode } from "react";
import type { Node } from "unist";
import { visit } from "unist-util-visit";
import { Highlight } from "prism-react-renderer";
import { codeTheme } from "./codeTheme";

export type MarkdownNode = Node & {
  type: string;
  value?: string;
  lang?: string;
  alt?: string;
  url?: string;
  children?: MarkdownNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  position?: {
    start?: { offset?: number };
    end?: { offset?: number };
  };
};

export function setHName(
  node: MarkdownNode,
  hName: string,
  hProperties?: Record<string, unknown>
) {
  const data = node.data ?? {};
  data.hName = hName;
  if (hProperties) {
    const existing =
      (data.hProperties as Record<string, unknown> | undefined) ?? {};
    data.hProperties = { ...existing, ...hProperties };
  }
  node.data = data;
}

export function replaceWithText(node: MarkdownNode, value: string) {
  node.type = "text";
  node.value = value;
  delete node.children;
}

export function isUnderlineStrong(node: MarkdownNode, source: string): boolean {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (start == null || end == null) return false;
  const slice = source.slice(start, end);
  return slice.startsWith("__") && slice.endsWith("__");
}

// Transform unsupported markdown nodes
export function remarkMarkdownTransforms() {
  return (tree: MarkdownNode, file: { value?: unknown }) => {
    const source = typeof file.value === "string" ? file.value : "";

    visit(tree, (node: MarkdownNode) => {
      switch (node.type) {
        // Headings → convert to paragraphs (strip # markers)
        case "heading":
          setHName(node, "p");
          break;

        // Strong: check if it's underline syntax
        case "strong":
          if (isUnderlineStrong(node, source)) {
            setHName(node, "span", { className: "sn-underline" });
          }
          break;

        // Inline math → InlineMath component
        case "inlineMath":
          setHName(node, "InlineMath", { math: node.value ?? "" });
          break;

        // Block math → BlockMath component
        case "math":
          setHName(node, "BlockMath", { math: node.value ?? "" });
          break;

        // Code blocks → preserve language attribute
        case "code":
          setHName(node, "CodeBlock", {
            code: node.value ?? "",
            language: node.lang ?? "text",
          });
          break;

        // Links → open in new tab
        case "link":
          setHName(node, "a", {
            href: node.url,
            target: "_blank",
            rel: "noreferrer",
          });
          break;

        // Images → render alt text only
        case "image":
          replaceWithText(node, node.alt ?? "");
          break;

        // Line breaks → br element
        case "break":
          setHName(node, "br");
          delete node.children;
          break;

        // Tables → render as text (will be handled by default)
        case "table":
        case "tableRow":
        case "tableCell":
          // Let these pass through as text
          break;

        // HTML → strip/render as text
        case "html":
          replaceWithText(node, "");
          break;

        default:
          break;
      }
    });
  };
}

// Syntax highlighted code block component
export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language: string;
}): ReactNode {
  return (
    <Highlight theme={codeTheme} code={code} language={language as unknown as Parameters<typeof Highlight>[0]['language']}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <pre className="sn-code-block">
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}
