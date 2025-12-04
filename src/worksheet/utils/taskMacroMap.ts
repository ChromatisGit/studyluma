import { TaskType } from "@worksheet/taskRegistry";

export type TaskMacroMap = Record<string, TaskType>;

export const TASK_MACRO_TO_KIND: TaskMacroMap = {
  textTask: "text",
  mathTask: "math",
  codeTask: "code",
  mcq: "mcq",
  gap: "gap",
};
