import type { Markdown } from "@schema/page";

export type FormulaMacro = {
  type: "formula";
  content: Markdown;
};
