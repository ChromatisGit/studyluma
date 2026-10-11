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
