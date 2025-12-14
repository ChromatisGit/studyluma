import { FreeResponseTask } from '../FreeResponseTask/FreeResponseTask';
import type { MathTask as MathTaskType } from '@worksheet/worksheetModel';

interface MathTaskProps {
  task: MathTaskType;
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
