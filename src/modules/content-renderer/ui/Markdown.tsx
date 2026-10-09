import {
  createContext,
  useContext,
  type ReactNode,
  type TableHTMLAttributes,
} from "react";
import * as production from "react/jsx-runtime";
import rehypeReact from "rehype-react";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { CodeBlock, type CodeBlockProps } from "./CodeBlock";
import { Merkkarte, MerkkarteBeispiel } from "./Merkkarte";
import {
  remarkDirectiveFallback,
  remarkDisplayFormula,
  remarkGaps,
  remarkHighlight,
  remarkMerkkarten,
  remarkTransforms,
  remarkUnwrapParagraph,
} from "./markdown/plugins";
import { BlockMath, InlineMath } from "./TypstMath";

type RenderGap = (index: number) => ReactNode;

const GapContext = createContext<RenderGap | null>(null);

function GapSlot({ index }: { index: number }) {
  const renderGap = useContext(GapContext);
  return <>{renderGap?.(index)}</>;
}

function GapCodeBlock(props: CodeBlockProps) {
  const renderGap = useContext(GapContext);
  return <CodeBlock {...props} renderGap={renderGap ?? undefined} />;
}

function MarkdownTable(props: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="table-wrap md-table">
      <table className="table" {...props} />
    </div>
  );
}

const components = {
  InlineMath,
  BlockMath,
  CodeBlock: GapCodeBlock,
  MarkdownTable,
  GapSlot,
  Merkkarte,
  MerkkarteBeispiel,
};

function processor(options: {
  merkkarten?: boolean;
  inline?: boolean;
  headingOffset?: number;
}) {
  const base = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkMath);
  const withCards = options.merkkarten ? base.use(remarkMerkkarten) : base;
  const shaped = options.inline
    ? withCards.use(remarkUnwrapParagraph)
    : withCards.use(remarkDisplayFormula);
  return shaped
    .use(remarkDirectiveFallback)
    .use(remarkHighlight)
    .use(remarkGaps)
    .use(remarkTransforms, { headingOffset: options.headingOffset })
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeReact, {
      Fragment: production.Fragment,
      jsx: production.jsx,
      jsxs: production.jsxs,
      components: components as never,
    });
}

const textProcessor = processor({});
const inlineProcessor = processor({ inline: true });
const summaryProcessor = processor({ merkkarten: true, headingOffset: 1 });

export interface MarkdownProps {
  markdown: string;
  /** Replaces gap placeholders, e.g. with input fields. */
  renderGap?: RenderGap | undefined;
  className?: string | undefined;
  /** Render a lone paragraph without its `<p>`, inside a `<span>`. */
  inline?: boolean;
}

function render(
  markdown: string,
  renderGap: RenderGap | undefined,
  run: typeof textProcessor,
) {
  const content = run.processSync(markdown).result as ReactNode;
  return renderGap ? (
    <GapContext.Provider value={renderGap}>{content}</GapContext.Provider>
  ) : (
    content
  );
}

/** Markdown with Typst math, tables, highlighter marks and gaps. */
export function Markdown({
  markdown,
  renderGap,
  className,
  inline,
}: MarkdownProps) {
  if (inline) {
    return (
      <span className={["md md--inline", className].filter(Boolean).join(" ")}>
        {render(markdown, renderGap, inlineProcessor)}
      </span>
    );
  }
  return (
    <div className={["md prose", className].filter(Boolean).join(" ")}>
      {render(markdown, renderGap, textProcessor)}
    </div>
  );
}

/**
 * A chapter summary (Zusammenfassung): Markdown with Merkkarten and real
 * headings. The page places it under its own h2, so `##` renders as h3.
 */
export function SummaryRenderer({ markdown }: { markdown: string }) {
  return (
    <div className="md prose zusammenfassung">
      {render(markdown, undefined, summaryProcessor)}
    </div>
  );
}
