import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { PairsMacro, PairItem } from "./types";

export const parser = defineMacro({
  type: "pairs",
  parser: (node): PairsMacro => {
    if (!node.content) {
      throw new Error("#pairs requires content [ ... ]");
    }

    const rawText = node.content.rawText;
    const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

    const items: PairItem[] = lines.map((line) => {
      const commaIndex = line.indexOf(",");
      if (commaIndex === -1) {
        throw new Error(`#pairs: each line must have "key, value" format. Got: "${line}"`);
      }
      const rawKey = line.slice(0, commaIndex).trim();
      const rawValue = line.slice(commaIndex + 1).replace(/,\s*$/, "").trim();

      return {
        key: parseRawText({ rawText: rawKey }, node.protectedBlocks),
        value: parseRawText({ rawText: rawValue }, node.protectedBlocks),
      };
    });

    if (items.length === 0) {
      throw new Error("#pairs requires at least one key-value pair");
    }

    return { type: "pairs", items };
  },
});

export const pairsParser = parser;
