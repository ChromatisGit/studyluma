import type { Markdown } from "@schema/page";

export type InputAnswer =
  | { kind: "number"; value: number }
  | { kind: "vector"; values: number[] }
  | { kind: "fraction"; numerator: number; denominator: number }
  | { kind: "power"; base: number; exponent: number };

export type InputTaskMacro = {
  type: "inputTask";
  instruction: Markdown;
  answer: InputAnswer;
  tolerance?: number;
  hint?: Markdown;
  why?: Markdown;
};
