import type { HighlightMacro as HighlightMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "../../utils/textUtils";
import clsx from "clsx";
import styles from "./HighlightMacro.module.css";

type Props = MacroComponentProps<HighlightMacroType>;

export function HighlightMacro({ macro }: Props) {
  const content = getMarkdown(macro.content);
  const isWarning = macro.icon === "warning";

  return (
    <div className={clsx(styles.highlight, isWarning && styles.warning)}>
      <MarkdownRenderer markdown={content ?? ""} />
    </div>
  );
}
