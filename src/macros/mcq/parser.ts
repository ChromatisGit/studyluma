import { deterministicShuffle } from "@pipeline/pageParser/utils/simpleHash";
import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { McqMacro } from "./types";

export const parser = defineMacro({
  type: "mcq",
  parser: (node): McqMacro => {
    const params = node.params as {
      single: boolean;
      wideLayout: boolean;
      shuffleOptions: boolean;
    };

    if (!node.content) {
      throw new Error("#mcq requires content.");
    }

    const lines = node.content.rawText.split(NEWLINE_REGEX);

    const firstOptionIndex = lines.findIndex((line) => {
      return CHECKBOX_LINE_REGEX.test(line.trim());
    });

    if (firstOptionIndex === -1) {
      throw new Error("#mcq must include a checklist using - [x] / - [ ].");
    }

    const question = parseRawText(
      { rawText: lines.slice(0, firstOptionIndex).join("\n").trim() },
      node.protectedBlocks
    );

    const options: McqMacro["options"] = [];
    const correct: McqMacro["correct"] = [];

    for (let i = firstOptionIndex; i < lines.length; i += 1) {
      const raw = lines[i].trim();
      if (!raw) continue;

      const match = CHECKBOX_OPTION_REGEX.exec(raw);
      if (!match) continue;

      const label = parseRawText({ rawText: match[2].trim() }, node.protectedBlocks);
      options.push(label);
      if (match[1].toLowerCase() === "x") {
        correct.push(label);
      }
    }

    if (options.length === 0) {
      throw new Error("#mcq must include at least one option.");
    }

    const finalOptions = params.shuffleOptions
      ? deterministicShuffle(options, `${question}`)
      : options;

    return {
      type: "mcq",
      question,
      options: finalOptions,
      correct,
      ...params,
    };
  },
  params: {
    single: false,
    wideLayout: false,
    shuffleOptions: true,
  },
});

export const mcqParser = parser;

const CHECKBOX_LINE_REGEX = /^-\s*\[[xX ]\]/;
const CHECKBOX_OPTION_REGEX = /^-\s*\[([xX ])\]\s*(.+)$/;
const NEWLINE_REGEX = /\r?\n/;
