import { Category, CategoryItem, CategoryType, TaskCategory } from "../../types";
import { RestoreCodeBlocks } from "./codeBlocks";
import { findNextMacro } from "./inlineMacroParsing";
import { parseGroupMacro, parseInfoMacro, parseTaskMacro } from "./macroParsing";
import { dedentFencedCodeBlocks, stripSharedIndentation } from "./text";
import type { TaskMacroMap } from "./worksheetParsing";

export type CategoryBlock = {
  name: string;
  body: string;
};

const CATEGORY_HEADING_REGEX = /^\s*=\s*(.+?)\s*$/;
const NEWLINE_REGEX = /\r?\n/;

const CATEGORY_ALIASES: Record<string, CategoryType> = {
  info: "info",
  information: "info",
  checkpoint: "checkpoint",
  checkpoints: "checkpoint",
  core: "core",
  aufgaben: "core",
  aufgabe: "core",
  tasks: "core",
  task: "core",
  challenge: "challenge",
  challenges: "challenge",
};

export function collectCategoryBlocks(content: string): CategoryBlock[] {
  const lines = content.split(NEWLINE_REGEX);
  const blocks: CategoryBlock[] = [];
  let currentName: string | null = null;
  let buffer: string[] = [];

  const pushCurrent = () => {
    if (currentName) {
      blocks.push({ name: currentName, body: buffer.join("\n").trim() });
    }
  };

  for (const line of lines) {
    const headingMatch = CATEGORY_HEADING_REGEX.exec(line);
    if (headingMatch) {
      pushCurrent();
      currentName = headingMatch[1].trim();
      buffer = [];
      continue;
    }

    if (currentName !== null) {
      buffer.push(line);
    }
  }

  pushCurrent();
  return blocks;
}

export function resolveCategoryKind(name: string, filePath: string): CategoryType {
  const normalized = name.trim().toLowerCase();
  const match = CATEGORY_ALIASES[normalized];

  if (!match) {
    const allowed = Object.keys(CATEGORY_ALIASES)
      .map((key) => `"${key}"`)
      .join(", ");
    throw new Error(
      `${filePath}: Unknown category "${name}". Known categories: ${allowed}.`
    );
  }

  return match;
}

export function parseCategoryBlock({
  block,
  restoreCodeBlocks,
  filePath,
  taskMacroToKind,
}: {
  block: CategoryBlock;
  restoreCodeBlocks: RestoreCodeBlocks;
  filePath: string;
  taskMacroToKind: TaskMacroMap;
}): Category {
  const categoryKind = resolveCategoryKind(block.name, filePath);

  if (categoryKind === "info") {
    const normalized = stripSharedIndentation(block.body);
    return {
      kind: "info",
      title: block.name,
      text: dedentFencedCodeBlocks(restoreCodeBlocks(normalized.trim())),
    };
  }

  const items = parseCategoryItems({
    body: block.body,
    restoreCodeBlocks,
    filePath,
    taskMacroToKind,
  });
  return {
    kind: categoryKind,
    items,
  } as TaskCategory;
}

function parseCategoryItems({
  body,
  restoreCodeBlocks,
  filePath,
  taskMacroToKind,
}: {
  body: string;
  restoreCodeBlocks: RestoreCodeBlocks;
  filePath: string;
  taskMacroToKind: TaskMacroMap;
}): CategoryItem[] {
  const items: CategoryItem[] = [];
  let cursor = 0;

  const pushTextAsInfo = (start: number, end: number) => {
    const rawText = body.slice(start, end);
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const normalized = stripSharedIndentation(trimmed);
    items.push({
      kind: "info",
      title: "Info",
      text: dedentFencedCodeBlocks(restoreCodeBlocks(normalized)),
    });
  };

  while (cursor < body.length) {
    const macro = findNextMacro(body, cursor);
    if (!macro) break;

    pushTextAsInfo(cursor, macro.start);

    if (macro.name === "group") {
      items.push(
        parseGroupMacro({
          macro,
          restoreCodeBlocks,
          filePath,
          taskMacroToKind,
        })
      );
    } else if (macro.name === "info") {
      items.push(parseInfoMacro(macro, restoreCodeBlocks));
    } else if (macro.name in taskMacroToKind) {
      const task = parseTaskMacro({
        macro,
        taskKind: taskMacroToKind[macro.name],
        restoreCodeBlocks,
        filePath,
      });
      items.push({
        kind: "taskSet",
        tasks: [task],
      });
    }

    cursor = macro.end;
  }

  pushTextAsInfo(cursor, body.length);

  return items;
}
