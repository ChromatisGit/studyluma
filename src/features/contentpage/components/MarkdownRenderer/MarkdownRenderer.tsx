import type { ReactNode } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeReact from "rehype-react";
import * as prod from "react/jsx-runtime";
import { InlineMath, BlockMath } from "react-katex";
import { remarkMarkdownTransforms, CodeBlock } from "./remarkTransforms";

const processor = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkMarkdownTransforms)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeReact, {
    Fragment: prod.Fragment,
    jsx: prod.jsx,
    jsxs: prod.jsxs,
    components: {
      InlineMath,
      BlockMath,
      CodeBlock,
    },
  });

interface MarkdownRendererProps {
  markdown: string;
}

export function MarkdownRenderer({ markdown }: MarkdownRendererProps): ReactNode {
  const rendered = processor.processSync(markdown).result as ReactNode;
  return <div className="sn-markdown">{rendered}</div>;
}
