import "server-only";

import { Page } from "@schema/page";
import { readFile } from "fs/promises";
import { join } from "path";

type Args = {
  subject: string;
  topicId: string;
  chapterId: string;
  worksheetId?: string;
};

export async function getPage(args: Args): Promise<Page | null> {
  const { subject, topicId, chapterId, worksheetId } = args;

  let sourcePath = [".generated", subject, topicId].join("/");
  sourcePath += worksheetId
    ? `/${chapterId}/worksheets/${worksheetId}.json`
    : `/${chapterId}.json`;

  const fullPath = join(process.cwd(), sourcePath);

  try {
    const fileContent = await readFile(fullPath, "utf-8");
    return JSON.parse(fileContent);
  } catch {
    return null;
  }
}
