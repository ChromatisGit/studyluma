import { useEffect, useMemo, useState } from 'react';
import { CollapsibleSection } from '@features/worksheet/components/CollapsibleSection/CollapsibleSection';
import { parseTextWithCode } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import { strings } from '@features/worksheet/config/strings';
import styles from './FreeResponseTask.module.css';
import type { MathTask as MathTaskType, TextTask as TextTaskType } from '@worksheet/worksheetModel';
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
  placeholder = strings.freeResponseTask.placeholder,
  taskKey,
}: FreeResponseTaskProps) {
  const { value: answer, setValue: setAnswer, worksheetId } = useTaskPersistence<string>(taskKey, '');
  const [isChecked, setIsChecked] = useState(false);

  const textareaRows = useMemo(() => {
    const solutionLines = task.solution ? task.solution.split('\n').length : 0;
    return Math.max(3, solutionLines + 1);
  }, [task.solution]);

  useEffect(() => {
    setIsChecked(false);
  }, [worksheetId]);

  useEffect(() => {
    if (triggerCheck > 0 && answer.trim()) {
      setIsChecked(true);
    }
  }, [triggerCheck, answer]);

  return (
    <div className={`${styles.stackMedium} ${isSingleTask ? styles.stackTight : ''}`}>
      <div className={styles.bodyText}>
        {parseTextWithCode(task.instruction, styles.bodyText)}
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder={placeholder}
        rows={textareaRows}
        className={styles.responseField}
      />

      <div className={styles.stackSmall}>
        {task.hint && <CollapsibleSection type="hint" content={task.hint} />}

        {task.solution && isChecked && (
          <CollapsibleSection type="solution" content={task.solution} />
        )}
      </div>
    </div>
  );
}
