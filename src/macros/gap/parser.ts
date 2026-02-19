import { restoreCodeBlocks } from "@pipeline/pageParser/codeBlockGuard";
import { deterministicShuffle } from "@pipeline/pageParser/utils/simpleHash";
import { defineMacro } from "@pipeline/pageParser/macros/parserUtils";
import { createMarkdown } from "@schema/page";
import type { GapField, GapMacro } from "./types";

type GapMode = "text" | "mcq";

export const parser = defineMacro({
  type: "gap",
  parser: (node): GapMacro => {
    const params = node.params as { mode: GapMode };

    if (!node.content) {
      throw new Error("#gap requires a [ ... ]");
    }

    const content = restoreCodeBlocks(node.content, node.protectedBlocks).rawText;

    const gaps: GapField[] = [];

    // Replace (( ... )) gap placeholders with Unicode sentinels and collect gap field data
    const withSentinels = content.replace(GAP_PLACEHOLDER_REGEX, (_match, inner: string) => {
      const index = gaps.length;

      const rawEntries = inner
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

      const baseOptions = rawEntries.length ? rawEntries : [""];

      const correct =
        params.mode === "text" ? baseOptions.map((t) => t.toLowerCase()) : [baseOptions[0]];

      const options =
        params.mode === "text" ? baseOptions : deterministicShuffle(baseOptions, inner);

      gaps.push({
        mode: params.mode,
        correct,
        ...(params.mode === "text" ? {} : { options }),
      });

      return `\uFFFE${index}\uFFFE`;
    });

    if (gaps.length === 0) {
      throw new Error("No gaps found in gap task.");
    }

    // Convert Typst bold syntax (*text*) to Markdown bold (**text**)
    const markdown = withSentinels.replace(/\*(.*?)\*/g, "**$1**");

    return {
      type: "gap",
      content: createMarkdown(markdown),
      gaps,
    };
  },
  params: {
    mode: "text",
  },
});

export const gapParser = parser;

const GAP_PLACEHOLDER_REGEX = /\(\(\s*([^()]+?)\s*\)\)/g;
