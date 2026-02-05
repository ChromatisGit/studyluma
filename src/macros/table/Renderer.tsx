import type { TableMacro } from "./types";
import type { MacroComponentProps } from "@macros/componentTypes";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@macros/markdownParser";
import styles from "./styles.module.css";

type Props = MacroComponentProps<TableMacro>;

export default function TableRenderer({ macro }: Props) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {macro.headers.map((header, i) => (
              <th key={i}>
                <MarkdownRenderer markdown={getMarkdown(header) ?? ""} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {macro.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>
                  <MarkdownRenderer markdown={getMarkdown(cell) ?? ""} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
