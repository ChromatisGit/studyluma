'use client';

import clsx from 'clsx';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { MarkdownRenderer } from '@features/contentpage/components/MarkdownRenderer/MarkdownRenderer';
import { type Macro, type MacroRenderContext, renderMacro, buildTaskKey, DISPLAY_MACRO_TYPES } from '@macros/registry';
import type { Markdown } from '@schema/page';

import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import sharedStyles from '@features/contentpage/contentpage.module.css';;
import styles from './TaskSetComponent.module.css';

const DISPLAY_MACRO_TYPE_SET: ReadonlySet<string> = new Set(DISPLAY_MACRO_TYPES);

export interface TaskSet {
  kind: "taskSet";
  intro?: Markdown | string;
  tasks: Macro[];
}

interface TaskSetComponentProps {
  taskSet: TaskSet;
  categoryType: 'checkpoint' | 'core' | 'challenge';
  taskNumber?: number;
  onTaskSetCompleted?: () => void;
}

function TaskNumberBadge({ number }: { number: string | number }) {
  return <span className={styles.taskBadge}>{number}</span>;
}

export function TaskSetComponent({ taskSet, categoryType, taskNumber, onTaskSetCompleted }: TaskSetComponentProps) {
  const showNumbering = categoryType !== 'checkpoint' && typeof taskNumber === 'number';
  const hasMultipleTasks = taskSet.tasks.length > 1;
  const [triggerCheck, setTriggerCheck] = useState(0);
  const currentTaskNumber = taskNumber ?? 0;
  const completedRef = useRef(false);

  // Compute the keys of input tasks (non-display macros) for completion tracking
  const inputTaskKeys = useMemo(() => (
    taskSet.tasks
      .map((task, index) => ({ task, key: buildTaskKey(task, index) }))
      .filter(({ task }) => !DISPLAY_MACRO_TYPE_SET.has(task.type))
      .map(({ key }) => key)
  ), [taskSet.tasks]);

  const [attemptedKeys, setAttemptedKeys] = useState<ReadonlySet<string>>(new Set());

  const handleAttemptedChange = useCallback((taskKey: string, attempted: boolean) => {
    setAttemptedKeys(prev => {
      const next = new Set(prev);
      if (attempted) next.add(taskKey);
      else next.delete(taskKey);
      return next;
    });
  }, []);

  const allInputsAttempted = inputTaskKeys.length === 0 || inputTaskKeys.every(key => attemptedKeys.has(key));

  // When check is triggered and all inputs are attempted, report completion
  useEffect(() => {
    if (triggerCheck === 0 || completedRef.current) return;
    if (allInputsAttempted) {
      completedRef.current = true;
      onTaskSetCompleted?.();
    }
  }, [triggerCheck, allInputsAttempted, onTaskSetCompleted]);

  const handleCheckSolution = () => {
    setTriggerCheck(prev => prev + 1);
  };

  return (
    <div className={styles.taskCard}>
      <div className={styles.taskStack}>
        {taskSet.intro && (
          <div className={styles.taskIntro}>
            {showNumbering && <TaskNumberBadge number={currentTaskNumber} />}
            <div className={styles.taskIntroText}>
              <MarkdownRenderer markdown={typeof taskSet.intro === 'string' ? taskSet.intro : taskSet.intro.markdown} />
            </div>
          </div>
        )}
        {!taskSet.intro && showNumbering && hasMultipleTasks && (
          <div className={styles.taskIntro}>
            <TaskNumberBadge number={currentTaskNumber} />
            <div className={clsx(sharedStyles.bodyText, styles.taskIntroText)} aria-hidden>
              &nbsp;
            </div>
          </div>
        )}

        {taskSet.tasks.map((task, index) => {
          const letter = String.fromCharCode(97 + index);
          const taskKey = buildTaskKey(task, index);

          let label = '';
          let showCircle = false;

          if (showNumbering) {
            if (hasMultipleTasks) {
              label = `${letter})`;
            } else {
              label = `${currentTaskNumber}`;
              showCircle = true;
            }
          }

          const onlyTask = !hasMultipleTasks;

          return (
            <div
              key={taskKey}
              className={clsx(styles.taskItem, onlyTask && styles.taskItemSolo)}
            >
              {showNumbering && (
                <>
                  {showCircle ? (
                    <TaskNumberBadge number={label} />
                  ) : (
                    <span className={styles.taskLabel}>{label}</span>
                  )}
                </>
              )}
              <div className={styles.taskContent}>
                <TaskRenderer
                  task={task}
                  triggerCheck={triggerCheck}
                  taskKey={taskKey}
                  taskNumber={currentTaskNumber}
                  onAttemptedChange={handleAttemptedChange}
                />
              </div>
            </div>
          );
        })}

        <div className={styles.taskActions}>
          <button
            type="button"
            onClick={handleCheckSolution}
            className={styles.checkButton}
          >
            {CONTENTPAGE_TEXT.buttons.checkSolution}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRenderer({ task, triggerCheck, taskKey, taskNumber, onAttemptedChange }: {
  task: Macro;
  triggerCheck: number;
  taskKey: string;
  taskNumber?: number;
  onAttemptedChange?: (taskKey: string, attempted: boolean) => void;
}) {
  const context: MacroRenderContext = {
    storageKey: taskKey,
    taskNumber,
    checkTrigger: triggerCheck,
    onAttemptedChange,
  };

  return renderMacro(task, context, taskKey);
}
