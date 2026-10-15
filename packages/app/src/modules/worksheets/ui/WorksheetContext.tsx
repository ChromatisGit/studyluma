import { createContext, useContext } from "react";
import type { WorksheetController } from "./useWorksheetController";

export const WorksheetContext = createContext<WorksheetController | null>(null);

export function useWorksheet(): WorksheetController {
  const controller = useContext(WorksheetContext);
  if (!controller) {
    throw new Error("useWorksheet needs a WorksheetContext provider");
  }
  return controller;
}

/**
 * A worksheet shown inside the lesson (`lesson/sheet/...`): the teacher can
 * take a task from it onto a blank surface. Null on the normal pages.
 */
export const EmbedContext = createContext<boolean>(false);

/** Tells the lesson window which task to put on a blank surface. */
export type TaskToBlankMessage = {
  source: "studyluma-sheet";
  type: "task-to-blank";
  sheetId: string;
  taskId: string;
};

export function sendTaskToBlank(sheetId: string, taskId: string) {
  const message: TaskToBlankMessage = {
    source: "studyluma-sheet",
    type: "task-to-blank",
    sheetId,
    taskId,
  };
  window.parent.postMessage(message, window.location.origin);
}
