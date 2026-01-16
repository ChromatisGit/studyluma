"use client";

import { FreeResponseTask } from '@features/contentpage/components/tasks/FreeResponseTask/FreeResponseTask';
import type { MathTaskMacro } from '@domain/macroTypes';

interface MathTaskProps {
  task: MathTaskMacro;
  isSingleTask?: boolean;
  triggerCheck: number;
  taskKey: string;
}

export function MathTask({ task, isSingleTask = false, triggerCheck, taskKey }: MathTaskProps) {
  return (
    <FreeResponseTask
      task={task}
      isSingleTask={isSingleTask}
      triggerCheck={triggerCheck}
      taskKey={taskKey}
    />
  );
}
