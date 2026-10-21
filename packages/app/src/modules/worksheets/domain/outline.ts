import type { RichNode, Task, TaskPart, Worksheet } from "../../catalog";
import { gapsOf, inputGraphicOf } from "../../content-renderer";

/**
 * What a page shows of a chapter's tasks in full: one sheet, the challenges,
 * everything, or nothing (the sidebar). The rest goes as outlines.
 */
export type SheetsShown = { sheetId: string } | "challenges" | "all" | "none";

/**
 * A part as progress, unlocking and the sidebar need it: ids, kinds and the
 * gaps or input Grafik an answer must fill, but no text or math. The catalog
 * is fixed per build, so each outline is made once and shared.
 */
const partOutlines = new WeakMap<TaskPart, TaskPart>();

function outlinePart(part: TaskPart): TaskPart {
  let outline = partOutlines.get(part);
  if (!outline) {
    const gaps = gapsOf(part.content);
    const graphic = inputGraphicOf(part.content);
    const content: RichNode[] = [
      ...(gaps.length ? [{ type: "paragraph" as const, children: gaps }] : []),
      ...(graphic ? [{ type: "graphic" as const, ...graphic }] : []),
    ];
    outline = {
      id: part.id,
      type: part.type,
      content,
      ...(part.answerKind ? { answerKind: part.answerKind } : {}),
      ...(part.steps
        ? {
            steps: {
              items: part.steps.items.map(({ id }) => ({ id, content: [] })),
            },
          }
        : {}),
      // An empty Musterlösung still says the part has one.
      markers: part.markers.loesung ? { loesung: [] } : {},
    };
    partOutlines.set(part, outline);
  }
  return outline;
}

const taskOutlines = new WeakMap<Task, Task>();

export function outlineTask(task: Task): Task {
  let outline = taskOutlines.get(task);
  if (!outline) {
    outline = {
      id: task.id,
      ...(task.title ? { title: task.title } : {}),
      ...(task.optional ? { optional: true } : {}),
      ...(task.prerequisites ? { prerequisites: task.prerequisites } : {}),
      items: task.items.flatMap((item) =>
        item.type === "part"
          ? [{ type: "part" as const, part: outlinePart(item.part) }]
          : [],
      ),
    };
    taskOutlines.set(task, outline);
  }
  return outline;
}

const sheetOutlines = new WeakMap<Worksheet, Worksheet>();

export function outlineSheet(sheet: Worksheet): Worksheet {
  let outline = sheetOutlines.get(sheet);
  if (!outline) {
    outline = {
      ...sheet,
      sections: sheet.sections.map((section) => ({
        id: section.id,
        checkpoint: section.checkpoint,
        title: section.title,
        items: section.items.flatMap((item) =>
          item.type === "task"
            ? [{ type: "task" as const, task: outlineTask(item.task) }]
            : [],
        ),
      })),
    };
    sheetOutlines.set(sheet, outline);
  }
  return outline;
}
