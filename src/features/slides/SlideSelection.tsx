"use client";

import Link from "next/link";
import styles from "./SlideSelection.module.css";

type SlideSelectionProps = {
  subjectId: string;
  topicId: string;
  chapterId: string;
  slideIds: string[];
};

export function SlideSelection({ subjectId, topicId, chapterId, slideIds }: SlideSelectionProps) {
  if (slideIds.length === 0) {
    return (
      <p className={styles.empty}>Keine Foliensätze für dieses Kapitel vorhanden.</p>
    );
  }

  const basePath = `/slides/${subjectId}/${topicId}/${chapterId}`;

  return (
    <ul className={styles.list}>
      {slideIds.map((id) => (
        <li key={id}>
          <Link href={`${basePath}/${id}`} className={styles.deckLink}>
            {id}
          </Link>
        </li>
      ))}
    </ul>
  );
}
