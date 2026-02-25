import type { Markdown } from "@schema/page";
import type { PairItem } from "../pairs/types";

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
  | "warning";

export type CardMacro = {
  type: "card";
  kind: CardKind;
  content: Markdown;
  pairs?: PairItem[];
};
