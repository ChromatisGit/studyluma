import type { Markdown } from "@schema/page";
import type { CodeLanguage } from "@macros/codeLanguage";

export type CodeTaskMacro = {
  type: "codeTask";
  instruction: Markdown;
  hint: Markdown;
  solution: Markdown;
  starter: string;
  validation?: string;
  language: CodeLanguage;
};
