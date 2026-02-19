import { deterministicShuffle } from "@pipeline/pageParser/utils/simpleHash";
import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { ProtectedBlock } from "@pipeline/pageParser/codeBlockGuard";
import type { MacroGroup } from "@schema/page";
import type { McqMacro } from "./types";

type McqParams = {
  single: boolean;
  wideLayout: boolean;
  shuffleOptions: boolean;
};

export const parser = defineMacro({
  type: "mcq",
  parser: (node): MacroGroup => {
    const params = node.params as McqParams;

    if (!node.content) {
      throw new Error("#mcq requires content.");
    }

    const blocks = splitIntoQuestionBlocks(node.content.rawText);

    if (blocks.length === 0) {
      throw new Error("#mcq must include a checklist using - [x] / - [ ].");
    }

    const macros: McqMacro[] = blocks.map((block) =>
      parseOneQuestion(block, node.protectedBlocks, params)
    );

    return { type: "group", macros };
  },
  params: {
    single: false,
    wideLayout: false,
    shuffleOptions: true,
  },
});

export const mcqParser = parser;

function parseOneQuestion(
  rawText: string,
  protectedBlocks: ProtectedBlock[],
  params: McqParams
): McqMacro {
  const lines = rawText.split(NEWLINE_REGEX);

  const firstOptionIndex = lines.findIndex((line) => {
    return CHECKBOX_LINE_REGEX.test(line.trim());
  });

  if (firstOptionIndex === -1) {
    throw new Error("#mcq must include a checklist using - [x] / - [ ].");
  }

  const question = parseRawText(
    { rawText: lines.slice(0, firstOptionIndex).join("\n").trim() },
    protectedBlocks
  );

  const options: McqMacro["options"] = [];
  const correct: McqMacro["correct"] = [];

  for (let i = firstOptionIndex; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const match = CHECKBOX_OPTION_REGEX.exec(raw);
    if (!match) continue;

    const label = parseRawText({ rawText: match[2].trim() }, protectedBlocks);
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
}

function splitIntoQuestionBlocks(rawText: string): string[] {
  const lines = rawText.split(NEWLINE_REGEX);
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let inOptions = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      currentBlock.push(line);
      continue;
    }

    if (CHECKBOX_LINE_REGEX.test(trimmed)) {
      inOptions = true;
      currentBlock.push(line);
    } else {
      if (inOptions) {
        // Non-checkbox, non-empty line after options → new question starts
        const block = currentBlock.join("\n").trim();
        if (block) blocks.push(block);
        currentBlock = [line];
        inOptions = false;
      } else {
        currentBlock.push(line);
      }
    }
  }

  const lastBlock = currentBlock.join("\n").trim();
  if (lastBlock) blocks.push(lastBlock);

  return blocks;
}

const CHECKBOX_LINE_REGEX = /^-\s*\[[xX ]\]/;
const CHECKBOX_OPTION_REGEX = /^-\s*\[([xX ])\]\s*(.+)$/;
const NEWLINE_REGEX = /\r?\n/;
