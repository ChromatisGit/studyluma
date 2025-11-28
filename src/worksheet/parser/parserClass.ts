import { RenderMode, Worksheet } from "../types";
import { protectCodeBlocks } from "./utils/codeBlocks";
import {
  collectCategoryBlocks,
  extractTitle,
  parseCategoryBlock,
  TaskMacroMap,
} from "./utils/worksheetParsing";

const TASK_MACRO_TO_KIND: TaskMacroMap = {
  textTask: "text",
  mathTask: "math",
  codeTask: "code",
  mcq: "mcq",
  gap: "gap",
};

export class WorksheetParser {
  private readonly filePath: string;
  private readonly rawContent: string;

  constructor(filePath: string, rawContent: string) {
    this.filePath = filePath;
    this.rawContent = rawContent;
  }

  parse(format: RenderMode): Worksheet {
    const { safeContent, restoreCodeBlocks } = protectCodeBlocks(
      this.rawContent
    );
    const title = extractTitle(safeContent, restoreCodeBlocks);
    const categoryBlocks = collectCategoryBlocks(safeContent);

    const content = categoryBlocks.map((block) =>
      parseCategoryBlock({
        block,
        restoreCodeBlocks,
        filePath: this.filePath,
        taskMacroToKind: TASK_MACRO_TO_KIND,
      })
    );

    return { title, format, content };
  }
}
