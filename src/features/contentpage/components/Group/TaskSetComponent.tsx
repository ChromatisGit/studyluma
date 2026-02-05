'use client';

import clsx from 'clsx';
import { useState } from 'react';
import { MarkdownRenderer } from '@features/contentpage/components/MarkdownRenderer/MarkdownRenderer';
import { type Macro, type MacroRenderContext, renderMacro, buildTaskKey } from '@macros/registry';
import type { Markdown } from '@schema/page';

import CONTENTPAGE_TEXT from '@features/contentpage/contentpage.de.json';
import sharedStyles from '@features/contentpage/contentpage.module.css';;
import styles from './TaskSetComponent.module.css';

export interface TaskSet {
  kind: "taskSet";
  intro?: Markdown | string;
  tasks: Macro[];
}

interface TaskSetComponentProps {
  taskSet: TaskSet;
  categoryType: 'checkpoint' | 'core' | 'challenge';
  taskNumber?: number;
}

function TaskNumberBadge({ number }: { number: string | number }) {
  return <span className={styles.taskBadge}>{number}</span>;
}

export function TaskSetComponent({ taskSet, categoryType, taskNumber }: TaskSetComponentProps) {
  const showNumbering = categoryType !== 'checkpoint' && typeof taskNumber === 'number';
  const hasMultipleTasks = taskSet.tasks.length > 1;
  const [triggerCheck, setTriggerCheck] = useState(0);
  const currentTaskNumber = taskNumber ?? 0;

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

// buildTaskKey is provided by @macros/registry

function TaskRenderer({ task, triggerCheck, taskKey, taskNumber }: {
  task: Macro;
  triggerCheck: number;
  taskKey: string;
  taskNumber?: number;
}) {
  const context: MacroRenderContext = {
    persistState: true,
    storageKey: taskKey,
    taskNumber,
    checkTrigger: triggerCheck,
  };

  return renderMacro(task, context, taskKey);
}
