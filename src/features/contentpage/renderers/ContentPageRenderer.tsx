"use client";

import clsx from "clsx";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { PageHeader } from "@components/PageHeader/PageHeader";
import type { Macro } from "@schema/macroTypes";
import type { Markdown, Node, Page } from "@schema/page";
import { getMarkdown } from "@features/contentpage/utils/textUtils";
import { renderMacro } from "@features/contentpage/macros/registry";
import type { MacroRenderContext } from "@features/contentpage/macros/types";
import styles from "./ContentPageRenderer.module.css";
import { WorksheetCards } from "@components/WorksheetCards";
import { WorksheetRef } from "@schema/courseContent";
import CONTENTPAGE_TEXT from "../contentpage.de.json";

type ContentPageRendererProps = Page & {
  worksheets?: WorksheetRef[]
  className?: string;
};

// Context for content page - no state persistence
const contentContext: MacroRenderContext = {
  persistState: false,
};

function renderTextBlock(text: string, key?: string | number) {
  return (
    <div key={key} className={styles.textBlock}>
      <MarkdownRenderer markdown={text} />
    </div>
  );
}

function renderSubheader(item: { type: "subheader"; header: Markdown }, key: number) {
  const headerText = getMarkdown(item.header) ?? "";
  return (
    <h3 key={key} className={styles.subheader}>
      <MarkdownRenderer markdown={headerText} />
    </h3>
  );
}

function renderContentItem(item: Node, index: number) {
  // Markdown text block
  if ("markdown" in item && typeof item.markdown === "string") {
    return renderTextBlock(item.markdown, index);
  }

  // Macro group
  if ("type" in item && item.type === "group") {
    return (
      <div key={index} className={styles.group}>
        {item.intro ? renderTextBlock(getMarkdown(item.intro) ?? "") : null}
        <div className={styles.groupTasks}>
          {item.macros.map((macro, macroIndex) =>
            renderMacro(macro, contentContext, macroIndex)
          )}
        </div>
      </div>
    );
  }

  // Subheader
  if ("type" in item && item.type === "subheader") {
    return renderSubheader(item, index);
  }

  // Macro - use the registry
  if ("type" in item) {
    return renderMacro(item as Macro, contentContext, index);
  }

  // Fallback for unknown types
  return (
    <pre key={index} className={styles.code}>
      <code>{JSON.stringify(item, null, 2)}</code>
    </pre>
  );
}

export function ContentPageRenderer({ title, content, worksheets, className }: ContentPageRendererProps) {
  const hasContent = content && content.length > 0;

  return (
    <div className={clsx(styles.content, className)}>
      {title && <PageHeader title={title} />}
      {hasContent && (
        <div className={styles.sections}>
          {worksheets && (<section key="0">
            <h2 className={styles.sectionTitle}>{CONTENTPAGE_TEXT.worksheetsSection.title}</h2>
            <WorksheetCards worksheets={worksheets} />
          </section>
          )}
          {content.map((section, sectionIndex) => (
            <section key={sectionIndex + 1} className={styles.section}>
              {section.header ? (
                <h2 className={styles.sectionTitle}>{section.header}</h2>
              ) : null}
              <div className={styles.sectionBody}>
                {(section.content ?? []).map((item, itemIndex) =>
                  renderContentItem(item, itemIndex)
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
