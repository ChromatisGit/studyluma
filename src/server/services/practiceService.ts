import "server-only";

import type { PracticeTask } from "@providers/practiceProvider";
import { getPracticeTasks as getPracticeTasksFromRepo } from "@providers/practiceProvider";

export type { PracticeTask } from "@providers/practiceProvider";

export function getPracticeTasks(courseId: string): PracticeTask[] {
  return getPracticeTasksFromRepo(courseId);
}
