import type { Markdown } from "@schema/page";

export type CalloutMacro = {
  type: "callout";
  content: Markdown;
};
