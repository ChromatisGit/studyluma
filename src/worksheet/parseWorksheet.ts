import { Worksheet } from "@worksheet/worksheetModel";
import { protectCodeBlocks } from "@worksheet/utils/codeBlocks";
import {
  collectCategoryBlocks,
  extractTitle,
  parseCategoryBlock,
} from "@worksheet/utils/worksheetParsing";

export function parseWorksheet(filePath: string, rawContent: string): Worksheet {
  try {
    const protectedBlocks = protectCodeBlocks(rawContent);
    const title = extractTitle(protectedBlocks.safeContent, protectedBlocks);
    const categoryBlocks = collectCategoryBlocks(protectedBlocks.safeContent);

    const content = categoryBlocks.map((block) => parseCategoryBlock({
      block,
      protectedBlocks,
    }));

    return { title, content };
  } catch (error) {
    throw appendFilePathToError(error, filePath);
  }
}

function appendFilePathToError(error: unknown, filePath: string): Error {
  if (error instanceof Error) {
    if (!error.message.includes(filePath)) {
      error.message = `${filePath}: ${error.message}`;
    }
    return error;
  }

  return new Error(`${filePath}: ${String(error)}`);
}
