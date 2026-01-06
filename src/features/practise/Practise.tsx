import type { PracticeTask } from "@data/practice";
import type { CourseId } from "@domain/ids";
import styles from "./Practise.module.css";

interface PractiseProps {
  courseId: CourseId;
  topicTitle: string;
  tasks: PracticeTask[];
}

export function Practise({ courseId, topicTitle, tasks }: PractiseProps) {
  return (
    <main className={styles.page}>
      <h1>Practice session</h1>
      <p>Course: {courseId}</p>
      <p>Topic: {topicTitle}</p>
      <p>Practice routes are stubbed with minimal tasks for now.</p>

      {tasks.length > 0 ? (
        <ol className={styles.taskList}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.taskItem}>
              <strong>{task.title}:</strong> {task.prompt}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyState}>No practice tasks are available yet.</p>
      )}
    </main>
  );
}
