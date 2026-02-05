import type { Markdown } from "@schema/page";

export type NoteMacro = {
  type: "note";
  content: Markdown;
};
