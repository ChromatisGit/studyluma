import WorksheetCard from "./WorksheetCard";
import type { WorksheetRef } from "@schema/courseContent";
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
