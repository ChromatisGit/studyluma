import type { Catalog } from "./types";

/** Ids of every task that has a solution to release. */
export function taskIds(catalog: Catalog): string[] {
  const ids: string[] = [];
  for (const sheet of catalog.worksheets) {
    for (const section of sheet.sections) {
      for (const item of section.items) {
        if (item.type === "task") {
          ids.push(item.task.id);
        }
      }
    }
  }
  for (const pool of catalog.challengePools) {
    pool.challenges.forEach((task) => ids.push(task.id));
  }
  return ids;
}
