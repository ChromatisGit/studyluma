import type { RawMacroBlock } from "@pipeline/pageParser/macros/splitMacroAndText";
import type { ProtectedBlock } from "@pipeline/pageParser/codeBlockGuard";
import { parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { StepsMacro } from "./types";

export function parseStepsFromNode(node: RawMacroBlock, protectedBlocks: ProtectedBlock[]): StepsMacro {
  const content = node.content ?? "";
  const items = content.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  return {
    type: "steps",
    items: items.map(item => parseRawText({ rawText: item }, protectedBlocks)),
  };
}
