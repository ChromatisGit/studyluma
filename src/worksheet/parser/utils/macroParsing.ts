import { CategoryItem, TaskSet } from "../../types";
import { TaskType, callTaskHandler } from "../taskRegistry";
import { RestoreCodeBlocks } from "./codeBlocks";
import {
  ParsedMacro,
  extractInlineMacros,
  findNextMacro,
  parseArgs,
} from "./inlineMacroParsing";
import { dedentFencedCodeBlocks, stripSharedIndentation } from "./text";
import type { TaskMacroMap } from "./worksheetParsing";

export function parseGroupMacro({
  macro,
  restoreCodeBlocks,
  filePath,
  taskMacroToKind,
}: {
  macro: ParsedMacro;
  restoreCodeBlocks: RestoreCodeBlocks;
  filePath: string;
  taskMacroToKind: TaskMacroMap;
}): TaskSet {
  const tasks = [] as TaskSet["tasks"];
  const introParts: string[] = [];
  let cursor = 0;

  while (cursor < macro.body.length) {
    const inner = findNextMacro(macro.body, cursor);
    if (!inner) break;

    introParts.push(macro.body.slice(cursor, inner.start));

    if (inner.name in taskMacroToKind) {
      tasks.push(
        parseTaskMacro({
          macro: inner,
          taskKind: taskMacroToKind[inner.name],
          restoreCodeBlocks,
          filePath,
        })
      );
    }

    cursor = inner.end;
  }

  introParts.push(macro.body.slice(cursor));

  const introText = introParts
    .map((part) => stripSharedIndentation(part).trim())
    .filter(Boolean)
    .join("\n\n");

  if (tasks.length === 0) {
    throw new Error(`${filePath}: #group[] must contain at least one task.`);
  }

  const introRestored = introText
    ? dedentFencedCodeBlocks(restoreCodeBlocks(introText))
    : undefined;

  return {
    kind: "taskSet",
    intro: introRestored,
    tasks,
  };
}

export function parseInfoMacro(
  macro: ParsedMacro,
  restoreCodeBlocks: RestoreCodeBlocks
): CategoryItem {
  const args = parseArgs(macro.params);
  const titleArg = args.title;
  const title =
    typeof titleArg === "string" && titleArg.trim().length > 0
      ? titleArg.trim()
      : "Info";

  const normalized = stripSharedIndentation(macro.body);
  return {
    kind: "info",
    title,
    text: dedentFencedCodeBlocks(restoreCodeBlocks(normalized.trim())),
  };
}

export function parseTaskMacro({
  macro,
  taskKind,
  restoreCodeBlocks,
  filePath,
}: {
  macro: ParsedMacro;
  taskKind: TaskType;
  restoreCodeBlocks: RestoreCodeBlocks;
  filePath: string;
}) {
  const { cleanedBody, inlineMacros } = extractInlineMacros(macro.body);
  const params = parseArgs(macro.params);
  const restoredBody = restoreCodeBlocks(cleanedBody);
  const restoredInlineMacros = Object.fromEntries(
    Object.entries(inlineMacros).map(([key, value]) => [
      key,
      restoreCodeBlocks(value),
    ])
  );
  const normalizedBody = dedentFencedCodeBlocks(
    stripSharedIndentation(restoredBody)
  );
  const normalizedInlineMacros = Object.fromEntries(
    Object.entries(restoredInlineMacros).map(([key, value]) => [
      key,
      dedentFencedCodeBlocks(stripSharedIndentation(value)),
    ])
  );

  try {
    return callTaskHandler(taskKind, {
      body: normalizedBody,
      inlineMacros: normalizedInlineMacros,
      params,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${filePath}: ${message}`);
  }
}
