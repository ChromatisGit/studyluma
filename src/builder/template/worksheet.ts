import { Category, Worksheet } from "@worksheet/worksheetModel";

export function renderWorksheet(worksheet: Worksheet): string {
  const mdx = [
    frontMatter(worksheet.title),
    imports(),
    title(worksheet.title),
    worksheetSection(worksheet.content),
  ]
    .filter(Boolean)
    .map((str) => dedent(str))
    .join("\n\n");

  return mdx;
}

function frontMatter(title: string) {
  return `
    ---
    title: "${title}"
    ---
  `;
}

function imports() {
  return `
    import { WorksheetContainer } from "@features/worksheet/components/WorksheetContainer/WorksheetContainer";
  `;
}

function title(title: string) {
  return `
    # ${title}
  `;
}

function worksheetSection(content: Category[]) {
  return `
  <WorksheetContainer content={${JSON.stringify(content)}} />
  `;
}

function dedent(str: string): string {
  return str
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .map(line => line.trim())
    .join("\n");
}
