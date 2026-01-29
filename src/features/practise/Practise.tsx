import type { PracticeTask } from "@services/practiceService";
import styles from "./Practise.module.css";
import PRACTISE_TEXT from "./practise.de.json";

interface PractiseProps {
  courseId: string;
  topicTitle: string;
  tasks: PracticeTask[];
}

export function Practise({ courseId, topicTitle, tasks }: PractiseProps) {
  return (
    <main className={styles.page}>
      <h1>{PRACTISE_TEXT.title}</h1>
      <p>{PRACTISE_TEXT.course}: {courseId}</p>
      <p>{PRACTISE_TEXT.topic}: {topicTitle}</p>
      <p>{PRACTISE_TEXT.stubMessage}</p>

      {tasks.length > 0 ? (
        <ol className={styles.taskList}>
          {tasks.map((task) => (
            <li key={task.id} className={styles.taskItem}>
              <strong>{task.title}:</strong> {task.prompt}
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyState}>{PRACTISE_TEXT.emptyState}</p>
      )}
    </main>
  );
}
