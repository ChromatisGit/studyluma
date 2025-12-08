import { TaskHandlerArgs } from "@worksheet/taskRegistry";
import { deterministicShuffle } from "@worksheet/utils/simpleHash";
import {
  dedentFencedCodeBlocks,
  stripSharedIndentation,
} from "@worksheet/utils/text";

const CHECKBOX_LINE_REGEX = /^-\s*\[[xX ]\]/;
const CHECKBOX_OPTION_REGEX = /^-\s*\[([xX ])\]\s*(.+)$/;
const NEWLINE_REGEX = /\r?\n/;

export type McqTask = {
  type: "mcq";
  question: string;
  correct: string[];
  options: string[];
  single: boolean;
  shuffleSolutions: boolean;
  wideLayout: boolean;
};

export function mcqTaskHandler({
  body,
  params,
}: TaskHandlerArgs): McqTask {
  const content = dedentFencedCodeBlocks(
    stripSharedIndentation(body)
  ).trim();
  const lines = content.split(NEWLINE_REGEX);

  const firstOptionIndex = lines.findIndex((line) => {
    return CHECKBOX_LINE_REGEX.test(line.trim());
  });

  if (firstOptionIndex === -1) {
    throw new Error("@mcq must include a checklist using - [x] / - [ ].");
  }

  const question = lines.slice(0, firstOptionIndex).join("\n").trim();

  const options: string[] = [];
  const correct: string[] = [];

  for (let i = firstOptionIndex; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const match = CHECKBOX_OPTION_REGEX.exec(raw);
    if (!match) continue;

    const label = match[2].trim();
    options.push(label);
    if (match[1].toLowerCase() === "x") {
      correct.push(label);
    }
  }

  if (options.length === 0) {
    throw new Error("@mcq must include at least one option.");
  }

  const wideLayout = params?.wideLayout === true;
  const shuffleSolutions = params?.shuffleSolutions !== false;
  const single = params?.single === true;
  const finalOptions = shuffleSolutions
    ? deterministicShuffle(options, `${question}?`)
    : options;

  return {
    type: "mcq",
    question,
    options: finalOptions,
    correct,
    single,
    shuffleSolutions,
    wideLayout,
  };
}
