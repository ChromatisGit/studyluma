import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { ProtectedBlock } from "@pipeline/pageParser/codeBlockGuard";
import type { MacroGroup } from "@schema/page";
import type { QuizMacro } from "./types";

type QuizParams = {
  single: boolean;
  timer: number | false;
};

export const parser = defineMacro({
  type: "quiz",
  parser: (node): QuizMacro | MacroGroup => {
    const params = node.params as QuizParams;

    if (!node.content) {
      throw new Error("#quiz requires content.");
    }

    const blocks = splitIntoQuestionBlocks(node.content.rawText);

    if (blocks.length === 0) {
      throw new Error("#quiz must include a checklist using - [x] / - [ ].");
    }

    if (blocks.length === 1) {
      // Single question: #why is available via inline macro extraction
      const whyRaw = node.inlineMacros?.["why"];
      const why = whyRaw
        ? parseRawText(whyRaw, node.protectedBlocks)
        : undefined;
      return parseOneQuestion(blocks[0], node.protectedBlocks, params, why);
    }

    // Multiple questions in one block: no per-question #why
    // (use separate #quiz[...] blocks per question if #why is needed)
    const macros: QuizMacro[] = blocks.map((block) =>
      parseOneQuestion(block, node.protectedBlocks, params, undefined)
    );

    return { type: "group", macros };
  },
  params: {
    single: true,
    timer: 20 as number | false,
  },
});

export const quizParser = parser;

function parseOneQuestion(
  rawText: string,
  protectedBlocks: ProtectedBlock[],
  params: QuizParams,
  why: QuizMacro["why"]
): QuizMacro {
  const lines = rawText.split(NEWLINE_REGEX);

  const firstOptionIndex = lines.findIndex((line) => {
    return CHECKBOX_LINE_REGEX.test(line.trim());
  });

  if (firstOptionIndex === -1) {
    throw new Error("#quiz must include a checklist using - [x] / - [ ].");
  }

  const question = parseRawText(
    { rawText: lines.slice(0, firstOptionIndex).join("\n").trim() },
    protectedBlocks
  );

  const options: QuizMacro["options"] = [];
  const correct: QuizMacro["correct"] = [];

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
    throw new Error("#quiz must include at least one option.");
  }

  return {
    type: "quiz",
    question,
    options,
    correct,
    single: params.single,
    timer: params.timer,
    why,
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
