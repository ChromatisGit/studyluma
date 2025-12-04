import path from "node:path";
import { OUT_DIR, readContentFile, writeGeneratedFile } from "@builder/io";
import { renderWorksheet } from "@builder/template/worksheet";
import { parseWorksheet } from "@worksheet/parseWorksheet";
import { WorksheetLocation } from "@worksheet/worksheetFiles";
import { generatePDF } from "./generatePDF";

const buildPdfPath = (target: string) =>
  path.resolve(process.cwd(), OUT_DIR, `${target}.pdf`);

export async function buildWorksheet(
  worksheet: WorksheetLocation,
): Promise<void> {
  if (worksheet.process === "web") {
    await buildWebWorksheet(worksheet.source, worksheet.target);
    return;
  }

  if (worksheet.process === "pdf") {
    await buildPdfWorksheet(worksheet.source, worksheet.target, false);
    return;
  }

  await Promise.all([
    buildPdfWorksheet(worksheet.source, worksheet.target, false),
    buildPdfWorksheet(worksheet.source, `${worksheet.target}-Loesung`, true),
  ]);
}

async function buildWebWorksheet(source: string, target: string) {
  const rawContent = await readContentFile(source);
  const renderedWorksheet = renderWorksheet(
    parseWorksheet(source, rawContent),
  );

  await writeGeneratedFile({
    relativePath: `${target}.mdx`,
    content: renderedWorksheet,
  });
}

async function buildPdfWorksheet(
  source: string,
  target: string,
  showSolutions: boolean,
) {
  await generatePDF(source, buildPdfPath(target), {
    showSolutions,
  });
}
