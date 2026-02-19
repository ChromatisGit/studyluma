"use client";

import type { Markdown } from "@schema/page";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./PresenterNotes.module.css";

type PresenterNotesProps = {
  notes: Markdown[];
};

export function PresenterNotes({ notes }: PresenterNotesProps) {
  if (notes.length === 0) return null;

  return (
    <div className={styles.notes}>
      <h3 className={styles.title}>Notizen</h3>
      {notes.map((note, i) => (
        <div key={i} className={styles.noteItem}>
          <MarkdownRenderer markdown={getMarkdown(note) ?? ""} />
        </div>
      ))}
    </div>
  );
}
