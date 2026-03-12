"use client";

import type { Node } from "@schema/page";
import { type Macro, type MacroRenderContext, renderMacro } from "@macros/registry";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import type { LayoutName } from "@macros/layout/types";
import styles from "./SlideRenderer.module.css";

const LAYOUT_CLASS: Partial<Record<LayoutName, string>> = {
  statement: styles.layoutStatement,
  code: styles.layoutCode,
  section: styles.layoutSection,
};

type SlideRendererProps = {
  header: string;
  content: Node[];
  context: MacroRenderContext;
  slideIndex: number;
};

function withStorageKey(
  context: MacroRenderContext,
  slideIndex: number,
  macroIndex: number
): MacroRenderContext {
  return { ...context, storageKey: `slide-${slideIndex}-macro-${macroIndex}` };
}

function renderSlideItem(
  item: Node,
  index: number,
  context: MacroRenderContext,
  slideIndex: number
) {
  // Markdown text block
  if ("markdown" in item && typeof item.markdown === "string") {
    return (
      <div key={index} className={styles.textBlock}>
        <MarkdownRenderer markdown={item.markdown} />
      </div>
    );
  }

  // Macro group
  if ("type" in item && item.type === "group") {
    return (
      <div key={index} className={styles.group}>
        {item.intro ? (
          <div className={styles.groupIntro}>
            <MarkdownRenderer markdown={getMarkdown(item.intro) ?? ""} />
          </div>
        ) : null}
        <div className={styles.groupTasks}>
          {item.macros.map((macro, mi) => {
            const groupKey = index * 100 + mi;
            return renderMacro(macro, withStorageKey(context, slideIndex, groupKey), mi);
          })}
        </div>
      </div>
    );
  }

  // Subheader
  if ("type" in item && item.type === "subheader") {
    const headerText = getMarkdown(item.header) ?? "";
    return (
      <h3 key={index} className={styles.subheader}>
        <MarkdownRenderer markdown={headerText} />
      </h3>
    );
  }

  // Macro
  if ("type" in item) {
    return renderMacro(item as Macro, withStorageKey(context, slideIndex, index), index);
  }

  return null;
}

export function SlideRenderer({ header, content, context, slideIndex }: SlideRendererProps) {
  const layoutNode = content.find(
    (node): node is Macro & { type: "layout"; name: LayoutName } =>
      "type" in node && node.type === "layout"
  );
  const layoutName: LayoutName = layoutNode?.name ?? "default";
  const filteredContent = content.filter((node) => !("type" in node && node.type === "layout"));

  const layoutClass = LAYOUT_CLASS[layoutName];
  const contentInnerClass = layoutClass
    ? `${styles.contentInner} ${layoutClass}`
    : styles.contentInner;
  const contentBoxClass = context.projector
    ? `${styles.contentBox} ${styles.contentBoxFull}`
    : styles.contentBox;

  const card = (
    <div className={contentBoxClass}>
      <div className={styles.slideHeader}>
        <h2 className={styles.headerTitle}>{header}</h2>
      </div>
      <div className={contentInnerClass}>
        {filteredContent.map((item, i) => renderSlideItem(item, i, context, slideIndex))}
      </div>
    </div>
  );

  if (context.projector) {
    return <div className={styles.slideFrame}>{card}</div>;
  }
  return <div className={styles.slidePreview}>{card}</div>;
}
