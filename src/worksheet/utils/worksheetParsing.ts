import { restoreCodeBlocks, type ProtectedCodeBlocks } from "./codeBlocks";
import { CategoryBlock, collectCategoryBlocks, parseCategoryBlock } from "./categoryParsing";

const TITLE_MACRO_REGEX = /#title\[(?<title>[\s\S]*?)\]/m;

export { collectCategoryBlocks, parseCategoryBlock };
export type { CategoryBlock };

export function extractTitle(
  content: string,
  protectedBlocks: Pick<ProtectedCodeBlocks, "fencedBlocks" | "inlineBlocks">,
): string {
  const match = TITLE_MACRO_REGEX.exec(content);
  const rawTitle = match?.groups?.title?.trim();
  const restored = rawTitle ? restoreCodeBlocks(rawTitle, protectedBlocks).trim() : "";
  return restored || "Unnamed Worksheet";
}
