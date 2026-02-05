import type { Markdown } from "@schema/page";

export type GapField = {
  mode: "text" | "mcq";
  correct: string[];
  options?: string[];
};

export type GapMacro = {
  type: "gap";
  content: Markdown;
  gaps: GapField[];
};
