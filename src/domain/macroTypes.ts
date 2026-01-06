import { RawText } from "./page";

type CodeLanguage = "ts" | "python";

type NoteMacro = {
  type: "note";
  content: RawText;
};

type CodeRunnerMacro = {
  type: "codeRunner";
  code: string;
  language: CodeLanguage;
};

type CodeTaskMacro = {
  type: "codeTask";
  instruction: RawText;
  hint: RawText;
  solution: RawText;
  starter: string;
  validation?: string;
  language: CodeLanguage;
};

type GapField = {
  mode: "text" | "mcq";
  correct: string[];
  options?: string[];
};

type GapPart =
  | { type: "text"; content: string }
  | { type: "gap"; gap: GapField };

type GapMacro = {
  type: "gap";
  parts: GapPart[];
};

type MathTaskMacro = {
  type: "mathTask";
  instruction: RawText;
  hint: RawText;
  solution: RawText;
};

type McqMacro = {
  type: "mcq";
  question: RawText;
  correct: RawText[];
  options: RawText[];
  single: boolean;
  shuffleOptions: boolean;
  wideLayout: boolean;
};

type TextTaskMacro = {
  type: "textTask";
  instruction: RawText;
  hint: RawText;
  solution: RawText;
};

type TableMacro = {
  type: "table";
  headers: RawText[];
  rows: RawText[][];
};

type ImageMacro = {
  type: "image";
  source: string;
  size: "S" | "M" | "L";
};

type HighlightMacro = {
  type: "highlight";
  icon: "info" | "warning";
  content: RawText
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
