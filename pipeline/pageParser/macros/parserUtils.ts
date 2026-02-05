import { createMarkdown, type Markdown, type Subheader } from "@schema/page";
import type { RawMacro } from "@pipeline/pageParser/macros/parseMacro";
import type { Params } from "@pipeline/pageParser/macros/parseParams";
import type { InlineMacroSchema } from "@pipeline/pageParser/macros/validateInlineMacros";
import type { RawText } from "@pipeline/types";
import type { ProtectedBlock } from "@pipeline/pageParser/codeBlockGuard";
import { restoreCodeBlocks } from "@pipeline/pageParser/codeBlockGuard";

export type MacroDefinition<TType extends string, TReturn> = {
  type: TType;
  parser: (node: RawMacro) => TReturn;
  inline?: InlineMacroSchema;
  params?: Params;
};

export const defineMacro = <TType extends string, TReturn>(
  definition: MacroDefinition<TType, TReturn>
): MacroDefinition<TType, TReturn> => definition;

export const defineMacroMap = <
  Map extends Record<string, MacroDefinition<string, unknown>>
>(
  map: { [K in keyof Map]: Map[K] & { type: K } }
): Map => map;

const SUBHEADER_REGEX = /^==\s+(.+)$/gm;

export function parseAndSplitRawText(
  rawText: RawText,
  protectedBlocks: ProtectedBlock[]
): (Markdown | Subheader)[] {
  const src = rawText.rawText;
  const matches = [...src.matchAll(SUBHEADER_REGEX)];

  if (matches.length === 0) {
    return [parseRawText(rawText, protectedBlocks)];
  }

  const nodes: (Markdown | Subheader)[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    if (match.index == null) {
      throw new Error("Expected subheader match.index to be defined");
    }

    const before = src.slice(lastIndex, match.index).trim();
    if (before.length > 0) {
      nodes.push(parseRawText({ rawText: before }, protectedBlocks));
    }

    const headerText = match[1].trim();
    if (headerText.length > 0) {
      nodes.push({
        type: "subheader",
        header: parseRawText({ rawText: headerText }, protectedBlocks),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  const after = src.slice(lastIndex).trim();
  if (after.length > 0) {
    nodes.push(parseRawText({ rawText: after }, protectedBlocks));
  }

  return nodes;
}

// Replaces selected Typst syntax with Markdown Syntax for rendering purposes
export function parseRawText(
  { rawText }: RawText,
  protectedBlocks: ProtectedBlock[]
): Markdown {
  const converted = rawText.replace(/\*(.*?)\*/g, "**$1**");
  const restored = restoreCodeBlocks({ rawText: converted }, protectedBlocks).rawText;
  return createMarkdown(restored);
}
