import "server-only";

import type { SlideDeck } from "@schema/slideTypes";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { tryCatch } from "@server-lib/errorHandler";

type GetSlideDeckArgs = {
  subject: string;
  topicId: string;
  chapterId: string;
  slideId: string;
};

export async function getSlideDeck(args: GetSlideDeckArgs): Promise<SlideDeck | null> {
  const { subject, topicId, chapterId, slideId } = args;
  const sourcePath = `.generated/${subject}/${topicId}/${chapterId}/slides/${slideId}.json`;

  const fullPath = join(process.cwd(), sourcePath);
  const fileContent = await tryCatch(readFile(fullPath, "utf-8"));

  if (!fileContent) return null;

  return JSON.parse(fileContent) as SlideDeck;
}

type ListSlideDecksArgs = {
  subject: string;
  topicId: string;
  chapterId: string;
};

export async function listSlideDecks(args: ListSlideDecksArgs): Promise<string[]> {
  const { subject, topicId, chapterId } = args;
  const dirPath = join(process.cwd(), `.generated/${subject}/${topicId}/${chapterId}/slides`);

  const files = await tryCatch(readdir(dirPath)) ?? [];
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}
