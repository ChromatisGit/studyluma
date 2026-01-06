'use client';

import { useState } from 'react';
import { CodeTask } from '@features/worksheet/components/tasks/CodeTask/CodeTask';
import { GapTask } from '@features/worksheet/components/tasks/GapTask/GapTask';
import { MathTask } from '@features/worksheet/components/tasks/MathTask/MathTask';
import { McqTask } from '@features/worksheet/components/tasks/McqTask/McqTask';
import { TextTask } from '@features/worksheet/components/tasks/TextTask/TextTask';
import { parseTextWithCode } from '@components/CodeBlock/parseTextWithCode';
import WORKSHEET_TEXT from '@features/worksheet/worksheet.de.json';
import sharedStyles from '@features/worksheet/styles/shared.module.css';
import styles from './TaskSetComponent.module.css';
import type { Task, TaskSet } from '@features/worksheet/worksheetModel';

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
              {parseTextWithCode(taskSet.intro, sharedStyles.bodyText)}
            </div>
          </div>
        )}
        {!taskSet.intro && showNumbering && hasMultipleTasks && (
          <div className={styles.taskIntro}>
            <TaskNumberBadge number={currentTaskNumber} />
            <div className={`${sharedStyles.bodyText} ${styles.taskIntroText}`} aria-hidden>
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
              className={`${styles.taskItem} ${onlyTask ? styles.taskItemSolo : ''}`}
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
                  isSingleTask={!hasMultipleTasks}
                  triggerCheck={triggerCheck}
                  taskKey={taskKey}
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
            {WORKSHEET_TEXT.buttons.checkSolution}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildTaskKey(task: Task, index: number) {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 40);

  switch (task.type) {
    case 'mcq':
      return `mcq-${normalize(task.question) || index}`;
    case 'gap':
      return `gap-${task.parts.length}-${index}`;
    case 'text':
    case 'math':
      return `${task.type}-${normalize(task.instruction) || index}`;
    case 'code':
      return `code-${normalize(task.instruction) || index}`;
    default:
      return `task-${index}`;
  }
}

function TaskRenderer({ task, isSingleTask, triggerCheck, taskKey }: {
  task: Task;
  isSingleTask: boolean;
  triggerCheck: number;
  taskKey: string;
}) {
  switch (task.type) {
    case 'mcq':
      return (
        <McqTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />
      );
    case 'gap':
      return (
        <GapTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />
      );
    case 'text':
      return (
        <TextTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />
      );
    case 'math':
      return (
        <MathTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />
      );
    case 'code':
      return (
        <CodeTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />
      );
    default:
      return null;
  }
}
