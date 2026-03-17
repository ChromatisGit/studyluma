import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { CardMacro, CardKind } from "./types";

const VALID_KINDS: CardKind[] = [
  "definition",
  "concept",
  "example",
  "check",
  "prompt",
  "task",
  "highlight",
  "recap",
  "remember",
  "warning",
  "answer",
  "plain",
];

export const parser = defineMacro({
  type: "card",
  params: {
    kind: "concept",
  },
  parser: (node): CardMacro => {
    if (!node.content) {
      throw new Error("#card requires content [ ... ]");
    }

    const kind = node.params?.kind as CardKind;
    if (!VALID_KINDS.includes(kind)) {
      throw new Error(
        `#card: unknown kind "${kind}". Valid kinds: ${VALID_KINDS.join(", ")}`
      );
    }

    const result: CardMacro = {
      type: "card",
      kind,
      content: parseRawText(node.content, node.protectedBlocks),
    };

    return result;
  },
});

export const cardParser = parser;
