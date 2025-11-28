import { TaskHandlerArgs } from "../taskRegistry";
import {
  dedentFencedCodeBlocks,
  stripSharedIndentation,
} from "../utils/text";

export type MathTask = {
  type: "math";
  instruction: string;
  hint: string;
  solution: string;
};

export function mathTaskHandler({
  body,
  inlineMacros,
}: TaskHandlerArgs): MathTask {
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
    throw new Error("Math task requires an instruction.");
  }
  if (!hint || !solution) {
    throw new Error("Math task requires #hint[...] and #solution[...].");
  }

  return {
    type: "math",
    instruction,
    hint,
    solution,
  };
}
