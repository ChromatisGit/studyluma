import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { KTableMacro } from "./types";

export const parser = defineMacro({
  type: "ktable",
  params: {
    cols: "auto",
    header: "false",
  },
  parser: (node): KTableMacro => {
    if (!node.content) {
      throw new Error("#ktable requires content [ ... ]");
    }

    const colsParam = node.params?.cols as string;
    const colsFixed = colsParam === "auto" ? null : parseInt(colsParam, 10);
    if (colsFixed !== null && (isNaN(colsFixed) || colsFixed < 1)) {
      throw new Error(`#ktable: "cols" must be a positive integer or "auto", got: "${colsParam}"`);
    }

    const header = node.params?.header === "true";

    const lines = node.content.rawText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new Error("#ktable requires at least one row");
    }

    const cols = colsFixed ?? lines[0].split(";").length;

    const rows = lines.map((line) => {
      const parts = line.split(";").map((p) => p.trim());
      if (parts.length !== cols) {
        throw new Error(
          `#ktable: row has ${parts.length} cell(s) but cols=${cols}. Row: "${line}"`
        );
      }
      return parts.map((cell) =>
        parseRawText({ rawText: cell }, node.protectedBlocks)
      );
    });

    return { type: "ktable", cols, header, rows };
  },
});
