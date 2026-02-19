import type { Markdown } from "@schema/page";

export type PresenterNoteMacro = {
  type: "pn";
  content: Markdown;
};
