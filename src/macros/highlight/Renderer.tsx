import type { HighlightMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import { Lightbulb, AlertTriangle } from "lucide-react";
import clsx from "clsx";
import styles from "./styles.module.css";
import MACROS_TEXT from "@macros/macros.de.json";

type Props = MacroComponentProps<HighlightMacro>;

export default function HighlightRenderer({ macro }: Props) {
  const content = getMarkdown(macro.content);
  const isWarning = macro.icon === "warning";
  const Icon = isWarning ? AlertTriangle : Lightbulb;
  const label = isWarning
    ? MACROS_TEXT.highlight.warning
    : MACROS_TEXT.highlight.hint;

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
