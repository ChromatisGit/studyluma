import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { FormulaMacro } from "./types";

export const parser = defineMacro({
  type: "formula",
  parser: (node): FormulaMacro => {
    if (!node.content) {
      throw new Error("#formula requires a [ ... ]");
    }
    return {
      type: "formula",
      content: parseRawText(node.content, node.protectedBlocks),
    };
  },
});
