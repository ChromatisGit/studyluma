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
      hint: parseRawText(node.inlineMacros!.hint, node.protectedBlocks),
      solution: parseRawText(node.inlineMacros!.solution, node.protectedBlocks),
    };
  },
  inline: {
    hint: "required",
    solution: "required",
  },
});

export const textTaskParser = parser;
