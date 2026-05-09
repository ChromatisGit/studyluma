import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { TextTaskMacro } from "./types";

export const parser = defineMacro({
  type: "textTask",
  parser: (node): TextTaskMacro => {
    if (!node.content) {
      throw new Error("#textTask requires an instruction.");
    }

    return {
      type: "textTask",
      instruction: parseRawText(node.content, node.protectedBlocks),
      hint: node.inlineMacros?.hint !== undefined ? parseRawText(node.inlineMacros.hint, node.protectedBlocks) : undefined,
      solution: node.inlineMacros?.solution !== undefined ? parseRawText(node.inlineMacros.solution, node.protectedBlocks) : undefined,
    };
  },
  inline: {
    hint: "optional",
    solution: "optional",
  },
});

export const textTaskParser = parser;
