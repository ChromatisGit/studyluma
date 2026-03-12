import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { CalloutMacro } from "./types";

export const parser = defineMacro({
  type: "callout",
  parser: (node): CalloutMacro => {
    if (!node.content) {
      throw new Error("#callout requires a [ ... ]");
    }
    return {
      type: "callout",
      content: parseRawText(node.content, node.protectedBlocks),
    };
  },
});
