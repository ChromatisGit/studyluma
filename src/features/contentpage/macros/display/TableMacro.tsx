import type { TableMacro as TableMacroType } from "@schema/macroTypes";
import type { MacroComponentProps } from "@features/contentpage/macros/types";
import { MarkdownRenderer } from "@features/contentpage/components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "@features/contentpage/utils/textUtils";
import styles from "./TableMacro.module.css";

type Props = MacroComponentProps<TableMacroType>;

export function TableMacro({ macro }: Props) {
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
