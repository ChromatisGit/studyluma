import type { CodeLanguage } from "@macros/codeLanguage";

export type CodeRunnerMacro = {
  type: "codeRunner";
  code: string;
  language: CodeLanguage;
};
