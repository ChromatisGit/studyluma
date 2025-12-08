import { CategoryItem, TaskSet } from "@worksheet/worksheetModel";
import { TaskType, callTaskHandler } from "@worksheet/taskRegistry";
import { restoreCodeBlocks, type ProtectedCodeBlocks } from "./codeBlocks";
import {
  ParsedMacro,
  extractInlineMacros,
  findNextMacro,
  parseArgs,
} from "./inlineMacroParsing";
import { TASK_MACRO_TO_KIND } from "./taskMacroMap";
import { dedentFencedCodeBlocks, stripSharedIndentation } from "./text";

export function parseGroupMacro({
  macro,
  protectedBlocks,
}: {
  macro: ParsedMacro;
  protectedBlocks: Pick<ProtectedCodeBlocks, "fencedBlocks" | "inlineBlocks">;
}): TaskSet {
  const tasks = [] as TaskSet["tasks"];
  const introParts: string[] = [];
  let cursor = 0;

  while (cursor < macro.body.length) {
    const inner = findNextMacro(macro.body, cursor);
    if (!inner) break;

    introParts.push(macro.body.slice(cursor, inner.start));

    if (inner.name in TASK_MACRO_TO_KIND) {
      tasks.push(
        parseTaskMacro({
          macro: inner,
          taskKind: TASK_MACRO_TO_KIND[inner.name],
          protectedBlocks,
        })
      );
    }

    cursor = inner.end;
  }

  introParts.push(macro.body.slice(cursor));


  const introText = introParts
    .map((part) => stripSharedIndentation(part))
    .filter(Boolean)
    .join("\n\n");

  if (tasks.length === 0) {
    throw new Error("#group[] must contain at least one task.");
  }

  const introRestored = introText
    ? dedentFencedCodeBlocks(restoreCodeBlocks(introText, protectedBlocks))
    : undefined;

  return {
    kind: "taskSet",
    intro: introRestored,
    tasks,
  };
}

export function parseInfoMacro(
  macro: ParsedMacro,
  protectedBlocks: Pick<ProtectedCodeBlocks, "fencedBlocks" | "inlineBlocks">
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
    text: dedentFencedCodeBlocks(restoreCodeBlocks(normalized.trim(), protectedBlocks)),
  };
}

export function parseTaskMacro({
  macro,
  taskKind,
  protectedBlocks,
}: {
  macro: ParsedMacro;
  taskKind: TaskType;
  protectedBlocks: Pick<ProtectedCodeBlocks, "fencedBlocks" | "inlineBlocks">;
}) {
  const { cleanedBody, inlineMacros } = extractInlineMacros(macro.body);
  const params = parseArgs(macro.params);
  const restoredBody = restoreCodeBlocks(cleanedBody, protectedBlocks);
  const restoredInlineMacros = Object.fromEntries(
    Object.entries(inlineMacros).map(([key, value]) => [
      key,
      restoreCodeBlocks(value, protectedBlocks),
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
    throw new Error(message);
  }
}
