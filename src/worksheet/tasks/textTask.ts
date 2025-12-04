import { TaskHandlerArgs } from "@worksheet/taskRegistry";
import {
  dedentFencedCodeBlocks,
  stripSharedIndentation,
} from "@worksheet/utils/text";

export type TextTask = {
  type: "text";
  instruction: string;
  hint: string;
  solution: string;
};

export function textTaskHandler({
  body,
  inlineMacros,
}: TaskHandlerArgs): TextTask {
  const instruction = dedentFencedCodeBlocks(
    stripSharedIndentation(body)
  ).trim();
  const hint = dedentFencedCodeBlocks(
    stripSharedIndentation(inlineMacros.hint ?? "")
  ).trim();
  const solution = dedentFencedCodeBlocks(
    stripSharedIndentation(inlineMacros.solution ?? "")
  ).trim();

  if (!instruction) {
    throw new Error("Text task requires an instruction.");
  }
  if (!hint || !solution) {
    throw new Error("Text task requires #hint[...] and #solution[...].");
  }

  return {
    type: "text",
    instruction,
    hint,
    solution,
  };
}
