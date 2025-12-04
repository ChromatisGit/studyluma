import { FreeResponseTask } from '../FreeResponseTask/FreeResponseTask';
import type { TextTask as TextTaskType } from '@worksheet/worksheetModel';

interface TextTaskProps {
  task: TextTaskType;
  isSingleTask?: boolean;
  triggerCheck: number;
}

export function TextTask({ task, isSingleTask = false, triggerCheck }: TextTaskProps) {
  return (
    <FreeResponseTask
      task={task}
      isSingleTask={isSingleTask}
      triggerCheck={triggerCheck}
    />
  );
}
