import type { Markdown } from "@schema/page";

export type MathTaskMacro = {
  type: "mathTask";
  instruction: Markdown;
  hint: Markdown;
  solution: Markdown;
};
