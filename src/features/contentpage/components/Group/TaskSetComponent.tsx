'use client';

import clsx from 'clsx';
import { MarkdownRenderer } from '@features/contentpage/components/MarkdownRenderer/MarkdownRenderer';
import { type Macro, type MacroRenderContext, renderMacro, buildTaskKey } from '@macros/registry';
import type { Markdown } from '@schema/page';

import sharedStyles from '@features/contentpage/contentpage.module.css';;
import styles from './TaskSetComponent.module.css';

export interface TaskSet {
  kind: "taskSet";
  intro?: Markdown | string;
  tasks: Macro[];
}

interface TaskSetComponentProps {
  taskSet: TaskSet;
  taskNumber?: number | undefined;
  triggerCheck: number;
  isPdfSection?: boolean | undefined;
}

function TaskNumberBadge({ number }: { number: string | number }) {
  return <span className={styles.taskBadge}>{number}</span>;
}

export function TaskSetComponent({ taskSet, taskNumber, triggerCheck, isPdfSection }: TaskSetComponentProps) {
  const showNumbering = typeof taskNumber === 'number';
  const hasMultipleTasks = taskSet.tasks.length > 1;
  const currentTaskNumber = taskNumber ?? 0;

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
                  pdfSection={isPdfSection}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRenderer({ task, triggerCheck, taskKey, taskNumber, pdfSection }: {
  task: Macro;
  triggerCheck: number;
  taskKey: string;
  taskNumber?: number | undefined;
  pdfSection?: boolean | undefined;
}) {
  const context: MacroRenderContext = {
    storageKey: taskKey,
    taskNumber,
    checkTrigger: triggerCheck,
    ...(pdfSection ? { pdfSection: true } : {}),
  };

  return renderMacro(task, context, taskKey);
}
