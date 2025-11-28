import { TaskHandlerArgs } from "../taskRegistry";
import {
  collapseNewlinePadding,
  dedentFencedCodeBlocks,
  stripSharedIndentation,
} from "../utils/text";

const GAP_PLACEHOLDER_REGEX = /\{\{\s*([^}]+?)\s*\}\}/g;

export type GapField = {
  mode: "text" | "mcq";
  correct: string[];
  options?: string[];
};

export type GapPart =
  | { type: "text"; content: string }
  | { type: "gap"; gap: GapField };

export type GapTask = {
  type: "gap";
  parts: GapPart[];
};

export function gapTaskHandler({
  body,
  params,
}: TaskHandlerArgs): GapTask {
  const content = collapseNewlinePadding(
    dedentFencedCodeBlocks(stripSharedIndentation(body))
  );

  const mcqMode = params?.mcq === true;

  const matches = [...content.matchAll(GAP_PLACEHOLDER_REGEX)];
  if (matches.length === 0) {
    throw new Error("No gaps found in gap task.");
  }

  const parts: GapPart[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const matchIndex = match.index ?? 0;

    if (matchIndex > lastIndex) {
      const textPart = collapseNewlinePadding(
        content.slice(lastIndex, matchIndex)
      );
      parts.push({ type: "text", content: textPart });
    }

    const rawEntries = match[1]
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const options = rawEntries.length ? rawEntries : [""];

    parts.push({
      type: "gap",
      gap: {
        mode: mcqMode ? "mcq" : "text",
        correct: mcqMode ? [options[0]] : options,
        ...(mcqMode ? { options } : {}),
      },
    });

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < content.length) {
    const trailing = collapseNewlinePadding(content.slice(lastIndex));
    parts.push({ type: "text", content: trailing });
  }

  return {
    type: "gap",
    parts,
  };
}
