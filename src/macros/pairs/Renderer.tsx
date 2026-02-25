import type { PairsMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<PairsMacro>;

export default function PairsRenderer({ macro }: Props) {
  return (
    <div className={styles.pairs}>
      {macro.items.map((item, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.key}>
            <MarkdownRenderer markdown={getMarkdown(item.key) ?? ""} />
          </div>
          <div className={styles.value}>
            <MarkdownRenderer markdown={getMarkdown(item.value) ?? ""} />
          </div>
        </div>
      ))}
    </div>
  );
}
