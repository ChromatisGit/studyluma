import { z } from "zod";

import { CodeTask, codeTaskHandler } from "./tasks/codeTask";
import { GapTask, gapTaskHandler } from "./tasks/gapTask";
import { MathTask, mathTaskHandler } from "./tasks/mathTask";
import { McqTask, mcqTaskHandler } from "./tasks/mcqTask";
import { TextTask, textTaskHandler } from "./tasks/textTask";

export type Task = McqTask | GapTask | TextTask | MathTask | CodeTask;

export type DecoratorArgs = Record<string, string | number | boolean>;

export type TaskHandlerArgs = {
  body: string;
  inlineMacros: Record<string, string>;
  params: DecoratorArgs;
};

type TaskHandler = (params: TaskHandlerArgs) => Task;

const taskRegistry = {
  text: textTaskHandler,
  math: mathTaskHandler,
  code: codeTaskHandler,
  mcq: mcqTaskHandler,
  gap: gapTaskHandler,
} satisfies Record<string, TaskHandler>;

export type TaskType = keyof typeof taskRegistry;

const taskTypes = Object.keys(taskRegistry) as TaskType[];
export const TaskTypeSchema = z.enum(taskTypes);

export function callTaskHandler(
  taskType: string,
  handlerArgs: TaskHandlerArgs
): Task {
  const parsedName = TaskTypeSchema.safeParse(taskType);

  if (!parsedName.success) {
    throw new Error(
      `Task macro "${taskType}" is not registered. ` +
        `Registered types: ${taskTypes.join(", ")}`
    );
  }

  const handler = taskRegistry[parsedName.data];
  return handler(handlerArgs);
}
