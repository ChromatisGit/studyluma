import type { NoteMacro as NoteMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "../../utils/textUtils";
import { Info } from "lucide-react";
import styles from "./NoteMacro.module.css";
import CONTENTPAGE_TEXT from "@features/contentpage/contentpage.de.json";

type Props = MacroComponentProps<NoteMacroType>;

export function NoteMacro({ macro }: Props) {
  const content = getMarkdown(macro.content);

  return (
    <div className={styles.note}>
      <div className={styles.header}>
        <Info className={styles.icon} />
        <span className={styles.label}>{CONTENTPAGE_TEXT.note.label}</span>
      </div>
      <div className={styles.content}>
        <MarkdownRenderer markdown={content ?? ""} />
      </div>
    </div>
  );
}
