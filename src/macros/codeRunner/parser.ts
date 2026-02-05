import { getProtectedBlockFromInlineMacro } from "@pipeline/pageParser/codeBlockGuard";
import { defineMacro } from "@pipeline/pageParser/macros/parserUtils";
import { isCodeLanguage } from "@macros/codeLanguage";
import type { CodeRunnerMacro } from "./types";

export const parser = defineMacro({
  type: "codeRunner",
  parser: (node): CodeRunnerMacro => {
    if (!node.content) {
      throw new Error("#codeRunner must be a fenced code block [ (```lang\\n...\\n```) ]");
    }

    const code = getProtectedBlockFromInlineMacro(
      node.content.rawText,
      node.protectedBlocks,
      "#codeRunner must be a fenced code block (```lang\\n...\\n```)",
      { requireLang: true }
    );

    const language = code.lang;
    if (!isCodeLanguage(language)) {
      throw new Error(`#codeRunner: unsupported language "${language}"`);
    }

    return {
      type: "codeRunner",
      code: code.text,
      language,
    };
  },
});

export const codeRunnerParser = parser;
