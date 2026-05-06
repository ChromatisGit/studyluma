import WorksheetCard from "./WorksheetCard";
import { Grid } from "@components/Grid";
import type { WorksheetRef } from "@schema/courseContent";

type WorksheetCardsProps = {
  worksheets: WorksheetRef[];
};

export function WorksheetCards({ worksheets }: WorksheetCardsProps) {
  return (
    <Grid minItemWidth={280} gap="md">
      {worksheets.map((worksheet) => (
        <WorksheetCard key={worksheet.href} {...worksheet} />
      ))}
    </Grid>
  );
}
