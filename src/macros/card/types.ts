import type { Markdown } from "@schema/page";

export type CardKind =
  | "definition"
  | "concept"
  | "example"
  | "check"
  | "prompt"
  | "task"
  | "highlight"
  | "recap"
  | "remember"
  | "warning"
  | "answer"
  | "plain";

export type CardMacro = {
  type: "card";
  kind: CardKind;
  content: Markdown;
};
