import type { Period } from "../domain/clock";
import type { FrameBlock, Lesson } from "../domain/lesson";
import lesson72 from "./fixtures/7-2/lesson.json";
import timetable from "./fixtures/timetable.json";

/**
 * Lesson frames from JSON fixtures, converted once from each chapter's
 * `tafel.md` (kept next to the fixture). The pipeline replaces this.
 */
const lessons: Record<string, Lesson> = { "7-2": lesson72 as Lesson };

const assets = import.meta.glob<string>("./fixtures/*/*.svg", {
  query: "?url",
  import: "default",
  eager: true,
});

function withAssetUrls(chapterId: string, blocks: FrameBlock[]): FrameBlock[] {
  return blocks.map((block) =>
    block.type === "image"
      ? {
          ...block,
          asset:
            assets[`./fixtures/${chapterId}/${block.asset}`] ?? block.asset,
        }
      : block,
  );
}

/** A chapter's lesson with image assets resolved to URLs. */
export function getLesson(chapterId: string): Lesson | undefined {
  const lesson = lessons[chapterId];
  if (!lesson) {
    return undefined;
  }
  return {
    ...lesson,
    frames: lesson.frames.map((frame) => ({
      ...frame,
      ...(frame.blocks
        ? { blocks: withAssetUrls(chapterId, frame.blocks) }
        : {}),
      ...(frame.columns
        ? {
            columns: frame.columns.map((column) =>
              withAssetUrls(chapterId, column),
            ),
          }
        : {}),
    })),
  };
}

export const hasLesson = (chapterId: string) => chapterId in lessons;

export const schoolPeriods = (): Period[] => timetable.periods;
