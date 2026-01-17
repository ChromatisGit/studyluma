import "server-only";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import type { CourseId } from "../data/courses";

type ProgressCursor = {
  currentTopicId: string;
  currentChapterId: string;
};

const PROGRESS_DIR = join(process.cwd(), ".data", "progress");
const PROGRESS_FILE = join(PROGRESS_DIR, "courses.json");

async function ensureProgressDir() {
  try {
    await mkdir(PROGRESS_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

async function loadProgressFromFile(): Promise<Map<string, ProgressCursor>> {
  try {
    const content = await readFile(PROGRESS_FILE, "utf-8");
    const data = JSON.parse(content) as Record<string, ProgressCursor>;
    return new Map(Object.entries(data));
  } catch {
    // File doesn't exist yet, return empty map
    return new Map();
  }
}

async function saveProgressToFile(progressMap: Map<string, ProgressCursor>): Promise<void> {
  await ensureProgressDir();
  const data = Object.fromEntries(progressMap);
  await writeFile(PROGRESS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getProgressStore(): Promise<Map<string, ProgressCursor>> {
  return loadProgressFromFile();
}

export async function setProgressInStore(
  courseId: CourseId,
  topicId: string,
  chapterId: string
): Promise<void> {
  const store = await loadProgressFromFile();
  store.set(courseId, {
    currentTopicId: topicId,
    currentChapterId: chapterId,
  });
  await saveProgressToFile(store);
}

export function clearProgressCache(): void {
  // No-op: progress is always read fresh from disk.
}
