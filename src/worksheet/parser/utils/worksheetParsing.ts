import type { TaskType } from "../taskRegistry";
import type { RestoreCodeBlocks } from "./codeBlocks";
import { CategoryBlock, collectCategoryBlocks, parseCategoryBlock } from "./categoryParsing";

const TITLE_MACRO_REGEX = /#title\[(?<title>[\s\S]*?)\]/m;

export type TaskMacroMap = Record<string, TaskType>;

export { collectCategoryBlocks, parseCategoryBlock };
export type { CategoryBlock };

export function extractTitle(
  content: string,
  restoreCodeBlocks: RestoreCodeBlocks
): string {
  const match = TITLE_MACRO_REGEX.exec(content);
  const rawTitle = match?.groups?.title?.trim();
  const restored = rawTitle ? restoreCodeBlocks(rawTitle).trim() : "";
  return restored || "Unnamed Worksheet";
}
