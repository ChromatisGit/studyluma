"use client";

import type { Node } from "@schema/page";
import { type Macro, type MacroRenderContext, renderMacro } from "@macros/registry";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./SlideRenderer.module.css";

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
  return (
    <div className={styles.slideFrame}>
      <div className={styles.headerBanner}>
        <div className={styles.headerIcon}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <h2 className={styles.headerTitle}>{header}</h2>
      </div>
      <div className={styles.contentBox}>
        <div className={styles.contentInner}>
          {content.map((item, i) => renderSlideItem(item, i, context, slideIndex))}
        </div>
      </div>
    </div>
  );
}
