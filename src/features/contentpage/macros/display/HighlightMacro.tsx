import type { HighlightMacro as HighlightMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "../../utils/textUtils";
import { Lightbulb, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import styles from "./HighlightMacro.module.css";
import CONTENTPAGE_TEXT from "@features/contentpage/contentpage.de.json";

type Props = MacroComponentProps<HighlightMacroType>;

export function HighlightMacro({ macro }: Props) {
  const content = getMarkdown(macro.content);
  const isWarning = macro.icon === "warning";
  const Icon = isWarning ? AlertTriangle : Lightbulb;
  const label = isWarning
    ? CONTENTPAGE_TEXT.highlight.warning
    : CONTENTPAGE_TEXT.highlight.hint;

  return (
    <div className={clsx(styles.highlight, isWarning && styles.warning)}>
      <div className={styles.header}>
        <Icon className={styles.icon} />
        <span className={styles.label}>{label}</span>
      </div>
      <div className={styles.content}>
        <MarkdownRenderer markdown={content ?? ""} />
      </div>
    </div>
  );
}
