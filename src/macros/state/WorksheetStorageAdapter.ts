import type { WorksheetStorage } from "@features/contentpage/storage/WorksheetStorage";
import type { MacroStateAdapter } from "./MacroStateAdapter";

export function createWorksheetAdapter(
  storage: WorksheetStorage
): MacroStateAdapter {
  return {
    read: (key) => storage.readResponse(key) || null,
    write: (key, value) => storage.saveResponse(key, value),
    isReadOnly: false,
  };
}
