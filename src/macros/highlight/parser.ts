import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { HighlightMacro } from "./types";

export const parser = defineMacro({
  type: "highlight",
  parser: (node): HighlightMacro => {
    const params = node.params as {
      icon: "info" | "warning";
    };

    if (!node.content) {
      throw new Error("#highlight requires a [ ... ]");
    }

    return {
      type: "highlight",
      icon: params.icon,
      content: parseRawText(node.content, node.protectedBlocks),
    };
  },
  params: {
    icon: "info",
  },
});

export const highlightParser = parser;
