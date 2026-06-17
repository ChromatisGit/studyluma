import type { Markdown } from "@schema/page";

export type HandwrittenTaskMacro = {
  type: "handwrittenTask";
  instruction: Markdown;
  hint?: Markdown;
  answer?: Markdown;
  space?: "s" | "m" | "l" | "page";
  grid?: "squares" | "lines" | "free";
};
