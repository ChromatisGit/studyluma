import type { FormulaMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<FormulaMacro>;

export default function FormulaRenderer({ macro }: Props) {
  const content = getMarkdown(macro.content);
  return (
    <div className={styles.formula}>
      <div className={styles.box}>
        <MarkdownRenderer markdown={content ?? ""} />
      </div>
    </div>
  );
}
