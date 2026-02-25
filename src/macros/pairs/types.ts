import type { Markdown } from "@schema/page";

export type PairItem = {
  key: Markdown;
  value: Markdown;
};

export type PairsMacro = {
  type: "pairs";
  items: PairItem[];
};
