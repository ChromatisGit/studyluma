import type { TableMacro as TableMacroType } from "@domain/macroTypes";
import type { MacroComponentProps } from "../types";
import { MarkdownRenderer } from "../../components/MarkdownRenderer/MarkdownRenderer";
import { getMarkdown } from "../../utils/textUtils";
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
