import { WorksheetRef } from "@worksheet/worksheetFiles";

export function worksheetCards(worksheets: WorksheetRef[]) {
  if (worksheets.length === 0) return "";

  const cards = worksheets
    .map(
      (worksheet) => `<WorksheetCard
  href={${JSON.stringify(worksheet.href)}}
  label={${JSON.stringify(worksheet.label)}}
  process={${JSON.stringify(worksheet.process)}}
/>`
    )
    .join("\n");

  return `import WorksheetCard from '@features/worksheet/components/WorksheetCard/WorksheetCard';

  ## Aufgaben
<div className="row">
  ${cards}
</div>
  `;
}
