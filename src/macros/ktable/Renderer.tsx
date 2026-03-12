import type { KTableMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<KTableMacro>;

export default function KTableRenderer({ macro }: Props) {
  return (
    <div
      className={styles.ktable}
      style={{ gridTemplateColumns: `repeat(${macro.cols}, auto)` }}
    >
      {macro.rows.map((row, ri) =>
        row.map((cell, ci) => (
          <div
            key={`${ri}-${ci}`}
            className={
              macro.header && ri === 0
                ? styles.headerCell
                : ci === 0
                  ? styles.keyCell
                  : styles.cell
            }
          >
            <MarkdownRenderer markdown={getMarkdown(cell) ?? ""} />
          </div>
        ))
      )}
    </div>
  );
}
