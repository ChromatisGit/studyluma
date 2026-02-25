import { defineMacro, parseRawText } from "@pipeline/pageParser/macros/parserUtils";
import type { CardMacro, CardKind } from "./types";
import type { PairItem } from "../pairs/types";

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
];

function parsePairsRawText(rawText: string, protectedBlocks: Parameters<typeof parseRawText>[1]): PairItem[] {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const commaIndex = line.indexOf(",");
    if (commaIndex === -1) {
      throw new Error(`#pairs inside #card: each line must have "key, value" format. Got: "${line}"`);
    }
    const rawKey = line.slice(0, commaIndex).trim();
    const rawValue = line.slice(commaIndex + 1).replace(/,\s*$/, "").trim();
    return {
      key: parseRawText({ rawText: rawKey }, protectedBlocks),
      value: parseRawText({ rawText: rawValue }, protectedBlocks),
    };
  });
}

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

    const inlinePairs = (node.inlineMacros as Record<string, { rawText: string }> | undefined)?.pairs;
    if (inlinePairs) {
      result.pairs = parsePairsRawText(inlinePairs.rawText, node.protectedBlocks);
    }

    return result;
  },
});

export const cardParser = parser;
