import type { NoteMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import { Info } from "lucide-react";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<NoteMacro>;

export default function NoteRenderer({ macro }: Props) {
  const content = getMarkdown(macro.content);

  return (
    <div className={styles.note}>
      <div className={styles.header}>
        <Info className={styles.icon} />
        <span className={styles.label}>{MACROS_TEXT.note.label}</span>
      </div>
      <div className={styles.content}>
        <MarkdownRenderer markdown={content ?? ""} />
      </div>
    </div>
  );
}
