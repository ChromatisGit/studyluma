'use client';

import { useMemo } from 'react';
import { CollapsibleSection } from '@features/worksheet/components/CollapsibleSection/CollapsibleSection';
import { parseTextWithCode } from '@components/CodeBlock/parseTextWithCode';
import WORKSHEET_TEXT from '@features/worksheet/worksheet.de.json';
import sharedStyles from '@features/worksheet/styles/shared.module.css';
import styles from './FreeResponseTask.module.css';
import type { MathTask as MathTaskType, TextTask as TextTaskType } from '@features/worksheet/worksheetModel';
import { useTaskPersistence } from '@features/worksheet/storage/useTaskPersistence';

type FreeResponseTaskType = TextTaskType | MathTaskType;

interface FreeResponseTaskProps {
  task: FreeResponseTaskType;
  isSingleTask?: boolean;
  triggerCheck: number;
  placeholder?: string;
  taskKey: string;
}

export function FreeResponseTask({
  task,
  isSingleTask = false,
  triggerCheck,
  placeholder = WORKSHEET_TEXT.freeResponseTask.placeholder,
  taskKey,
}: FreeResponseTaskProps) {
  const { value: answer, setValue: setAnswer } = useTaskPersistence<string>(taskKey, '');
  const isChecked = triggerCheck > 0 && Boolean(answer.trim());

  const textareaRows = useMemo(() => {
    const solutionLines = task.solution ? task.solution.split('\n').length : 0;
    return Math.max(3, solutionLines + 1);
  }, [task.solution]);

  return (
    <div className={`${sharedStyles.stackMedium} ${isSingleTask ? sharedStyles.stackTight : ''}`}>
      <div className={sharedStyles.bodyText}>
        {parseTextWithCode(task.instruction, sharedStyles.bodyText)}
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={placeholder}
        rows={textareaRows}
        className={styles.responseField}
      />

      <div className={sharedStyles.stackSmall}>
        {task.hint && <CollapsibleSection type="hint" content={task.hint} />}

        {task.solution && isChecked && (
          <CollapsibleSection type="solution" content={task.solution} />
        )}
      </div>
    </div>
  );
}
