"use client";

import type { Markdown } from "@schema/page";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./PresenterNotes.module.css";

type PresenterNotesProps = {
  notes: Markdown[] | string[] | string | undefined;
};

export function PresenterNotes({ notes }: PresenterNotesProps) {
  if (!notes) return null;

  const normalized = Array.isArray(notes) ? notes : [notes];
  if (normalized.length === 0) return null;

  return (
    <div className={styles.notes}>
      <h3 className={styles.title}>Notizen</h3>
      {normalized.map((note, i) => (
        <div key={i} className={styles.noteItem}>
          <MarkdownRenderer markdown={typeof note === "string" ? note : (getMarkdown(note) ?? "")} />
        </div>
      ))}
    </div>
  );
}
