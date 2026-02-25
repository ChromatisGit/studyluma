"use client";

import Link from "next/link";
import { Monitor, Presentation } from "lucide-react";
import styles from "./SlideSelection.module.css";

type SlideSelectionProps = {
  subjectId: string;
  topicId: string;
  chapterId: string;
  slideIds: string[];
  isLoading?: boolean;
};

export function SlideSelection({ subjectId, topicId, chapterId, slideIds, isLoading }: SlideSelectionProps) {
  if (isLoading) {
    return <p className={styles.loading}>Folien werden geladen...</p>;
  }

  if (slideIds.length === 0) {
    return (
      <p className={styles.empty}>Keine Foliensätze für dieses Kapitel vorhanden.</p>
    );
  }

  const basePath = `/slides/${subjectId}/${topicId}/${chapterId}`;

  return (
    <ul className={styles.list}>
      {slideIds.map((id) => (
        <li key={id} className={styles.deckItem}>
          <span className={styles.deckName}>{id}</span>
          <div className={styles.deckActions}>
            <Link href={`${basePath}/${id}`} target="_blank" className={styles.presenterLink}>
              <Presentation size={15} />
              Präsentation
            </Link>
            <Link href={`${basePath}/${id}/projector`} target="_blank" className={styles.projectorLink}>
              <Monitor size={15} />
              Projektor
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
