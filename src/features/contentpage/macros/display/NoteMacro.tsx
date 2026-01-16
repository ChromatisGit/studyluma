import type { NoteMacro as NoteMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "../../utils/textUtils";
import styles from "./NoteMacro.module.css";

type Props = MacroComponentProps<NoteMacroType>;

export function NoteMacro({ macro }: Props) {
  const content = getMarkdown(macro.content);

  return (
    <div className={styles.note}>
      <div className={styles.label}>Note</div>
      <MarkdownRenderer markdown={content ?? ""} />
    </div>
  );
}
