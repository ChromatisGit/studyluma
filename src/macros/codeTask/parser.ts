import { getProtectedBlockFromInlineMacro } from "@pipeline/pageParser/codeBlockGuard";
import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import { isCodeLanguage } from "@macros/codeLanguage";
import type { CodeTaskMacro } from "./types";

export const parser = defineMacro({
  type: "codeTask",
  parser: (node): CodeTaskMacro => {
    if (!node.content) {
      throw new Error("#codeTask requires an instruction.");
    }

    const starterBlock = getProtectedBlockFromInlineMacro(
      node.inlineMacros!.starter.rawText,
      node.protectedBlocks,
      "#codeTask: #starter must be a fenced code block (```lang\\n...\\n```)",
      { requireLang: true }
    );

    const language = starterBlock.lang;
    if (!isCodeLanguage(language)) {
      throw new Error(`#codeTask: unsupported language "${language}"`);
    }

    const starter = starterBlock.text;

    let validation: string | undefined;
    const validationRaw = node.inlineMacros!.validation?.rawText;
    if (validationRaw) {
      const validationBlock = getProtectedBlockFromInlineMacro(
        validationRaw,
        node.protectedBlocks,
        "#codeTask: #validation must be a fenced code block (```lang\\n...\\n```)"
      );

      validation = validationBlock.text;
    }

    return {
      type: "codeTask",
      instruction: parseRawText(node.content, node.protectedBlocks),
      hint: parseRawText(node.inlineMacros!.hint, node.protectedBlocks),
      solution: parseRawText(node.inlineMacros!.solution, node.protectedBlocks),
      starter,
      validation,
      language,
    };
  },
  inline: {
    hint: "required",
    solution: "required",
    starter: "required",
    validation: "optional",
  },
});

export const codeTaskParser = parser;
