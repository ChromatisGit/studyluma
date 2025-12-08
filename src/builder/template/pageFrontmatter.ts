import { WorksheetRef } from "@worksheet/worksheetFiles";
import { worksheetCards } from "./worksheetCards";

type PageTemplateInput = {
  label: string;
  isIndexPage: boolean;
  sidebar?: string;
  body: string;
  worksheets: WorksheetRef[];
};

export function renderPageWithFrontmatter(input: PageTemplateInput) {
  const frontmatterLines = [
    `title: ${input.label}`,
    ...(input.isIndexPage ? [`sidebar_position: -1`] : []),
  ];

  return [
    "---",
    ...frontmatterLines,
    "---",
    worksheetCards(input.worksheets),
    input.body.trim(),
    "",
  ].join("\n");
}

