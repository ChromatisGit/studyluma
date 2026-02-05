import type { Markdown } from "@schema/page";

export type McqMacro = {
  type: "mcq";
  question: Markdown;
  correct: Markdown[];
  options: Markdown[];
  single: boolean;
  shuffleOptions: boolean;
  wideLayout: boolean;
};
