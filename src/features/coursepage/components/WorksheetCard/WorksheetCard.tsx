import { Card } from "@/components/Card";
import type { WorksheetRef } from "@domain/courseContent";

export const WORKSHEET_ACTIONS = {
  web: {
    icon: "file-code",
    actionLabel: "Online öffnen",
  },
  pdf: {
    icon: "file",
    actionLabel: "PDF herunterladen",
  },
  pdfSolution: {
    icon: "file-text",
    actionLabel: "Lösung herunterladen",
  },
} as const;


export default function WorksheetCard({ label, href, worksheetFormat }: WorksheetRef) {
  return (
    <Card
      title={label}
      {...WORKSHEET_ACTIONS[worksheetFormat]}
      href={href}
    />
  );
}
