import type { Markdown } from "@schema/page";

export type TextTaskMacro = {
  type: "textTask";
  instruction: Markdown;
  hint?: Markdown;
  answer?: Markdown;
  why?: Markdown;
};
