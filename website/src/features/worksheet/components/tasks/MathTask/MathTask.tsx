import { FreeResponseTask } from '../FreeResponseTask/FreeResponseTask';
import type { MathTask as MathTaskType } from '@worksheet/worksheetModel';

interface MathTaskProps {
  task: MathTaskType;
  isSingleTask?: boolean;
  triggerCheck: number;
}

export function MathTask({ task, isSingleTask = false, triggerCheck }: MathTaskProps) {
  return (
    <FreeResponseTask
      task={task}
      isSingleTask={isSingleTask}
      triggerCheck={triggerCheck}
    />
  );
}
