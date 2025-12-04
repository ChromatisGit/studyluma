import type { CodeTask } from "./tasks/codeTask";
import type { GapField, GapPart, GapTask } from "./tasks/gapTask";
import type { MathTask } from "./tasks/mathTask";
import type { McqTask } from "./tasks/mcqTask";
import type { TextTask } from "./tasks/textTask";

// Core worksheet task definitions
export type Task = McqTask | GapTask | TextTask | MathTask | CodeTask;

// Page structure
export type InfoBlock = {
  kind: "info";
  title: string;
  text: string;
};

export type TaskSet = {
  kind: "taskSet";
  intro?: string;
  tasks: Task[];
};

export type CategoryItem = TaskSet | InfoBlock;

export const categoryTypes = ["info", "checkpoint", "core", "challenge"] as const;
export type CategoryType = (typeof categoryTypes)[number];

export type TaskCategory = {
  kind: Exclude<CategoryType, "info">;
  items: CategoryItem[];
};

export type Category = InfoBlock | TaskCategory;
export type WorksheetBlock = Category;

export type Worksheet = {
  title: string;
  content: Category[];
};

export type {
  CodeTask,
  GapField,
  GapPart,
  GapTask,
  MathTask,
  McqTask,
  TextTask,
};
