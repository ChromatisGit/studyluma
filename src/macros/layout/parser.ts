import { defineMacro } from "@pipeline/pageParser/macros/parserUtils";
import type { LayoutMacro, LayoutName } from "./types";

const VALID_LAYOUTS: LayoutName[] = ["default", "statement", "code", "section"];

export const parser = defineMacro({
  type: "layout",
  parser: (node): LayoutMacro => {
    if (!node.content) {
      throw new Error("#layout requires a name: #layout[statement]");
    }

    const name = node.content.rawText.trim() as LayoutName;
    if (!VALID_LAYOUTS.includes(name)) {
      throw new Error(
        `#layout: unknown layout "${name}". Valid layouts: ${VALID_LAYOUTS.join(", ")}`
      );
    }

    return { type: "layout", name };
  },
});

export const layoutParser = parser;
