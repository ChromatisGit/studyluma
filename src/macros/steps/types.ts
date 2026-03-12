import type { Markdown } from "@schema/page";

export type StepsMacro = {
  type: "steps";
  items: Markdown[];
};
