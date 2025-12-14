import { useRef, useState, type RefObject } from 'react';
import { CodeTask } from '@features/worksheet/components/tasks/CodeTask/CodeTask';
import { GapTask } from '@features/worksheet/components/tasks/GapTask/GapTask';
import { MathTask } from '@features/worksheet/components/tasks/MathTask/MathTask';
import { McqTask } from '@features/worksheet/components/tasks/McqTask/McqTask';
import { TextTask } from '@features/worksheet/components/tasks/TextTask/TextTask';
import { parseTextWithCode } from '@features/worksheet/components/CodeBlock/parseTextWithCode';
import { strings } from '@features/worksheet/config/strings';
import styles from './TaskSetComponent.module.css';
import type { Task, TaskSet } from '@worksheet/worksheetModel';

interface TaskSetComponentProps {
  taskSet: TaskSet;
  categoryType: "checkpoint" | "core" | "challenge";
  taskCounterRef: RefObject<number>;
}

export function TaskSetComponent({ taskSet, categoryType, taskCounterRef }: TaskSetComponentProps) {
  const showNumbering = categoryType !== "checkpoint";
  const hasMultipleTasks = taskSet.tasks.length > 1;
  const [triggerCheck, setTriggerCheck] = useState(0);

  // Assign a task number once per component instance to avoid double-increment in Strict Mode
  const assignedNumberRef = useRef<number | null>(null);
  if (assignedNumberRef.current === null) {
    const number = taskCounterRef.current;
    if (showNumbering) {
      taskCounterRef.current += 1;
    }
    assignedNumberRef.current = number;
  }
  const currentTaskNumber = assignedNumberRef.current;

  const handleCheckSolution = () => {
    setTriggerCheck(prev => prev + 1);
  };

  // Component to render the task number badge
  const TaskNumberBadge = ({ number }: { number: string | number }) => (
    <span className={styles.taskBadge}>
      {number}
    </span>
  );

  return (
    <div className={styles.taskCard}>
      <div className={styles.taskStack}>
        {taskSet.intro && (
          <div className={styles.taskIntro}>
            {showNumbering && <TaskNumberBadge number={currentTaskNumber} />}
            <div className={styles.bodyText}>
              {parseTextWithCode(taskSet.intro, styles.bodyText)}
            </div>
          </div>
        )}
        {!taskSet.intro && showNumbering && hasMultipleTasks && (
          <div className={styles.taskIntro}>
            <TaskNumberBadge number={currentTaskNumber} />
            <div className={styles.bodyText} aria-hidden="true">
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

          const onlyTask = taskSet.tasks.length === 1;

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
            onClick={handleCheckSolution}
            className={styles.checkButton}
          >
            {strings.buttons.checkSolution}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildTaskKey(task: Task, index: number) {
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 40);

  if (task.type === "mcq") {
    return `mcq-${normalize(task.question) || index}`;
  }
  if (task.type === "gap") {
    return `gap-${task.parts.length}-${index}`;
  }
  if (task.type === "text" || task.type === "math") {
    return `${task.type}-${normalize(task.instruction) || index}`;
  }
  if (task.type === "code") {
    return `code-${normalize(task.instruction) || index}`;
  }

  return `task-${index}`;
}

function TaskRenderer({ task, isSingleTask, triggerCheck, taskKey }: {
  task: Task;
  isSingleTask: boolean;
  triggerCheck: number;
  taskKey: string;
}) {
  if (task.type === "mcq") {
    return <McqTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />;
  }

  if (task.type === "gap") {
    return <GapTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />;
  }

  if (task.type === "text") {
    return <TextTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />;
  }

  if (task.type === "math") {
    return <MathTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />;
  }

  if (task.type === "code") {
    return <CodeTask task={task} isSingleTask={isSingleTask} triggerCheck={triggerCheck} taskKey={taskKey} />;
  }

  return null;
}
