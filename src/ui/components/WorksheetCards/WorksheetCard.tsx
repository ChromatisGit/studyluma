import { Card } from "@components/Card";
import type { WorksheetRef } from "@schema/courseContent";
import UI_TEXT from "@ui/ui.de.json";

const WORKSHEET_ICONS = {
  web: "file-code",
  pdf: "file",
  pdfSolution: "file-text",
} as const;


export default function WorksheetCard({ label, href, worksheetFormat }: WorksheetRef) {
  return (
    <Card
      title={label}
      icon={WORKSHEET_ICONS[worksheetFormat]}
      actionLabel={UI_TEXT.worksheetCard[worksheetFormat]}
      href={href}
    />
  );
}
