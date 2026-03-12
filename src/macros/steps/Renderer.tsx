import type { StepsMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<StepsMacro>;

export default function StepsRenderer({ macro }: Props) {
  return (
    <div className={styles.steps}>
      {macro.items.map((item, i) => (
        <div key={i} className={styles.step}>
          <div className={styles.num}>{i + 1}</div>
          <div className={styles.content}>
            <MarkdownRenderer markdown={getMarkdown(item) ?? ""} />
          </div>
        </div>
      ))}
    </div>
  );
}
