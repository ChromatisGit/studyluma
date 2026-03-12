import type { Markdown } from "@schema/page";

export type KTableMacro = {
  type: "ktable";
  cols: number;
  header: boolean;
  rows: Markdown[][];
};
