import { writeFile, readFile } from "./io";

export type PageFile = {
  source: string;
  target: string;
  label: string;
  sidebar?: string;
};

export async function processPageFile(file: PageFile) {
  const { source, target, label, sidebar } = file;

  const body = await readFile(source);

  const frontmatterLines = [
    `title: ${label}`,
    ...(sidebar ? [`sidebar: ${sidebar}`] : []),
  ];

  const content = [
    "---",
    ...frontmatterLines,
    "---",
    body.trim(),
    "",
  ].join("\n");

  await writeFile({ relativePath: target, content });
}