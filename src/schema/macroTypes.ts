import { Markdown } from "./page";

export type CodeLanguage = "ts" | "python";

export type NoteMacro = {
  type: "note";
  content: Markdown;
};

export type CodeRunnerMacro = {
  type: "codeRunner";
  code: string;
  language: CodeLanguage;
};

export type CodeTaskMacro = {
  type: "codeTask";
  instruction: Markdown;
  hint: Markdown;
  solution: Markdown;
  starter: string;
  validation?: string;
  language: CodeLanguage;
};

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

export type MathTaskMacro = {
  type: "mathTask";
  instruction: Markdown;
  hint: Markdown;
  solution: Markdown;
};

export type McqMacro = {
  type: "mcq";
  question: Markdown;
  correct: Markdown[];
  options: Markdown[];
  single: boolean;
  shuffleOptions: boolean;
  wideLayout: boolean;
};

export type TextTaskMacro = {
  type: "textTask";
  instruction: Markdown;
  hint: Markdown;
  solution: Markdown;
};

export type TableMacro = {
  type: "table";
  headers: Markdown[];
  rows: Markdown[][];
};

export type ImageMacro = {
  type: "image";
  source: string;
  width: number;
  height: number;
  size: "S" | "M" | "L";
};

export type HighlightMacro = {
  type: "highlight";
  icon: "info" | "warning";
  content: Markdown
};

export type Macro =
  | NoteMacro
  | CodeRunnerMacro
  | CodeTaskMacro
  | GapMacro
  | MathTaskMacro
  | McqMacro
  | TextTaskMacro
  | TableMacro
  | ImageMacro
  | HighlightMacro;
