import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { NoteMacro } from "./types";

export const parser = defineMacro({
  type: "note",
  parser: (node): NoteMacro => {
    if (!node.content) {
      throw new Error("#note requires a [ ... ]");
    }

    return {
      type: "note",
      content: parseRawText(node.content, node.protectedBlocks),
    };
  },
});

export const noteParser = parser;
