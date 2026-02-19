import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { PresenterNoteMacro } from "./types";

export const parser = defineMacro({
  type: "pn",
  allowedIn: ["slides"],
  parser: (node): PresenterNoteMacro => {
    if (!node.content) {
      throw new Error("#pn requires a [ ... ]");
    }

    return {
      type: "pn",
      content: parseRawText(node.content, node.protectedBlocks),
    };
  },
});
