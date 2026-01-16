"use client";

import { FreeResponseTask } from '@features/contentpage/components/tasks/FreeResponseTask/FreeResponseTask';
import type { TextTaskMacro } from '@domain/macroTypes';

interface TextTaskProps {
  task: TextTaskMacro;
  isSingleTask?: boolean;
  triggerCheck: number;
  taskKey: string;
}

export function TextTask({ task, isSingleTask = false, triggerCheck, taskKey }: TextTaskProps) {
  return (
    <FreeResponseTask
      task={task}
      isSingleTask={isSingleTask}
      triggerCheck={triggerCheck}
      taskKey={taskKey}
    />
  );
}
