import WorksheetCard from "@features/worksheet/components/WorksheetCard/WorksheetCard";
import styles from "./WorksheetCards.module.css";
import { WorksheetRef } from "@/shared/schema/course";

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
