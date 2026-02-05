import type { Markdown } from "@schema/page";

export type HighlightMacro = {
  type: "highlight";
  icon: "info" | "warning";
  content: Markdown;
};
