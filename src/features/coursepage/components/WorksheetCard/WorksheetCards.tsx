import WorksheetCard from "./WorksheetCard";
import type { WorksheetRef } from "@domain/courseContent";
import styles from "./WorksheetCards.module.css";

type WorksheetCardsProps = {
  worksheets: WorksheetRef[];
};

export function WorksheetCards({ worksheets }: WorksheetCardsProps) {
  return (
    <div className={styles.grid}>
      {worksheets.map((worksheet) => (
        <WorksheetCard key={worksheet.href} {...worksheet} />
      ))}
    </div>
  );
}
