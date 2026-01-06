"use client";

import { parseTextWithCode, renderInlineMarkdown } from "@components/CodeBlock/parseTextWithCode";
import type { Macro } from "@domain/macroTypes";
import type { Node, Page, RawText } from "@domain/page";
import styles from "./GeneratedPage.module.css";

type GeneratedPageProps = Page & {
  className?: string;
};

type TableMacro = Extract<Macro, { type: "table" }>;
type NoteMacro = Extract<Macro, { type: "note" }>;

function getRawText(value: RawText | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "rawText" in value) {
    const raw = (value as { rawText?: unknown }).rawText;
    return typeof raw === "string" ? raw : null;
  }
  return null;
}

function renderTextBlock(text: string, key?: string | number) {
  return (
    <div key={key} className={styles.textBlock}>
      {parseTextWithCode(text, styles.text)}
    </div>
  );
}

function renderCodeBlock(code: string, key?: string | number) {
  return (
    <pre key={key} className={styles.code}>
      <code>{code}</code>
    </pre>
  );
}

function renderTable(item: TableMacro, key: number) {
  return (
    <div key={key} className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {item.headers.map((header, headerIndex) => (
              <th key={headerIndex}>
                {renderInlineMarkdown(getRawText(header) ?? "")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {item.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  {renderInlineMarkdown(getRawText(cell) ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderNote(item: NoteMacro, key: number) {
  const noteText = getRawText(item.content) ?? "";
  return (
    <div key={key} className={styles.note}>
      <div className={styles.noteLabel}>Note</div>
      {renderTextBlock(noteText)}
    </div>
  );
}

function renderMacro(macro: Macro, key: number) {
  if (macro.type === "codeRunner") {
    return renderCodeBlock(macro.code, key);
  }

  if (macro.type === "table") {
    return renderTable(macro, key);
  }

  if (macro.type === "note") {
    return renderNote(macro, key);
  }

  if (macro.type === "highlight") {
    return (
      <div key={key} className={styles.highlight}>
        Highlight
      </div>
    );
  }

  if (macro.type === "gap") {
    const text = macro.parts
      .map((part) => (part.type === "text" ? part.content : "_____"))
      .join("");
    return (
      <div key={key} className={styles.task}>
        <div className={styles.taskLabel}>Gap</div>
        {renderTextBlock(text)}
      </div>
    );
  }

  if (macro.type === "mcq") {
    const question = getRawText(macro.question);
    const options = (macro.options ?? [])
      .map((option) => getRawText(option))
      .filter((option): option is string => Boolean(option));

    return (
      <div key={key} className={styles.task}>
        <div className={styles.taskLabel}>MCQ</div>
        {question ? renderTextBlock(question) : null}
        {options.length > 0 ? (
          <ul className={styles.optionList}>
            {options.map((option, optionIndex) => (
              <li key={optionIndex}>{option}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (macro.type === "codeTask") {
    const instruction = getRawText(macro.instruction);
    const hint = getRawText(macro.hint);
    const solution = getRawText(macro.solution);

    return (
      <div key={key} className={styles.task}>
        <div className={styles.taskLabel}>Code task</div>
        {instruction ? renderTextBlock(instruction) : null}
        {macro.starter ? renderCodeBlock(macro.starter) : null}
        {(hint || solution) && (
          <div className={styles.taskMeta}>
            {hint ? (
              <details>
                <summary>Hint</summary>
                {renderTextBlock(hint)}
              </details>
            ) : null}
            {solution ? (
              <details>
                <summary>Solution</summary>
                {renderTextBlock(solution)}
              </details>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (macro.type === "textTask") {
    const instruction = getRawText(macro.instruction);
    const hint = getRawText(macro.hint);
    const solution = getRawText(macro.solution);

    return (
      <div key={key} className={styles.task}>
        <div className={styles.taskLabel}>Text task</div>
        {instruction ? renderTextBlock(instruction) : null}
        {(hint || solution) && (
          <div className={styles.taskMeta}>
            {hint ? (
              <details>
                <summary>Hint</summary>
                {renderTextBlock(hint)}
              </details>
            ) : null}
            {solution ? (
              <details>
                <summary>Solution</summary>
                {renderTextBlock(solution)}
              </details>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  if (macro.type === "mathTask") {
    const instruction = getRawText(macro.instruction);
    const hint = getRawText(macro.hint);
    const solution = getRawText(macro.solution);

    return (
      <div key={key} className={styles.task}>
        <div className={styles.taskLabel}>Math task</div>
        {instruction ? renderTextBlock(instruction) : null}
        {(hint || solution) && (
          <div className={styles.taskMeta}>
            {hint ? (
              <details>
                <summary>Hint</summary>
                {renderTextBlock(hint)}
              </details>
            ) : null}
            {solution ? (
              <details>
                <summary>Solution</summary>
                {renderTextBlock(solution)}
              </details>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <pre key={key} className={styles.code}>
      <code>{JSON.stringify(macro, null, 2)}</code>
    </pre>
  );
}

function renderContentItem(item: Node, index: number) {
  if ("rawText" in item && typeof item.rawText === "string") {
    return renderTextBlock(item.rawText, index);
  }

  if ("type" in item && item.type === "group") {
    return (
      <div key={index} className={styles.group}>
        {item.intro ? renderTextBlock(getRawText(item.intro) ?? "") : null}
        <div className={styles.groupTasks}>
          {item.macros.map((macro, macroIndex) => renderMacro(macro, macroIndex))}
        </div>
      </div>
    );
  }

  if ("type" in item) {
    return renderMacro(item, index);
  }

  return (
    <pre key={index} className={styles.code}>
      <code>{JSON.stringify(item, null, 2)}</code>
    </pre>
  );
}

export function GeneratedPage({ title, content, className }: GeneratedPageProps) {
  const hasContent = content && content.length > 0;

  return (
    <div className={`${styles.content} ${className ?? ""}`.trim()}>
      {title && <h1 className={styles.title}>{title}</h1>}
      {hasContent && (
        <div className={styles.sections}>
          {content.map((section, sectionIndex) => (
            <section key={sectionIndex} className={styles.section}>
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
