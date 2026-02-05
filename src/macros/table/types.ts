import type { Markdown } from "@schema/page";

export type TableMacro = {
  type: "table";
  headers: Markdown[];
  rows: Markdown[][];
};
