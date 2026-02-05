import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { MathTaskMacro } from "./types";

export const parser = defineMacro({
  type: "mathTask",
  parser: (node): MathTaskMacro => {
    if (!node.content) {
      throw new Error("#mathTask requires an instruction.");
    }

    return {
      type: "mathTask",
      instruction: parseRawText(node.content, node.protectedBlocks),
      hint: parseRawText(node.inlineMacros!.hint, node.protectedBlocks),
      solution: parseRawText(node.inlineMacros!.solution, node.protectedBlocks),
    };
  },
  inline: {
    hint: "required",
    solution: "required",
  },
});

export const mathTaskParser = parser;
