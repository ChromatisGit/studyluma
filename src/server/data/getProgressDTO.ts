import "server-only";

import { ProgressChapterDTO, ProgressDTO, ProgressStatus, ProgressTopicDTO } from "@/domain/progressDTO";
import { CourseId, resolveCourse } from "./courses";

export async function getProgressDTO(courseId: CourseId): Promise<ProgressDTO> {
  const { topics } = resolveCourse(courseId);

  const { currentTopicId, currentChapterId } = await getCurrentTopicAndChapter(courseId);

  const currentTopicIndex = topics.findIndex((topic) => topic.topicId === currentTopicId);

  const topicsWithStatus = topics.map((topic, topicIndex) => {
    const topicStatus = getTopicStatus(topicIndex - currentTopicIndex);

    if (topicStatus === "locked") {
      return {
        ...topic,
        status: "locked" as const,
        chapters: [],
      };
    }

    const currentChapterIndex =
      topicStatus === "current"
        ? topic.chapters.findIndex((c) => c.chapterId === currentChapterId)
        : -1;

    const chaptersWithStatus = topic.chapters.map(
      ({ chapterId, label, href, worksheets }, chapterIndex) => ({
        chapterId,
        label,
        href,
        worksheets,
        status: getChapterStatus(topicStatus, chapterIndex, currentChapterIndex),
      })
    ) as ProgressChapterDTO[];

    return {
      ...topic,
      status: topicStatus,
      chapters: chaptersWithStatus,
    };
  }) as ProgressTopicDTO[];

  return {
    currentTopicId,
    currentChapterId,
    topics: topicsWithStatus,
  };
}


function getTopicStatus(offset: number): ProgressStatus {
    if (offset < 0) return "finished";
    if (offset === 0) return "current";
    if (offset === 1) return "planned";
    return "locked"; // offset > 1
}

function getChapterStatus(
    topicStatus: ProgressStatus,
    chapterIndex: number,
    currentChapterIndex: number
): ProgressStatus {
    if (topicStatus === "finished") return "finished";
    if (topicStatus === "planned") return "locked";

    // only "current" topics reach this point
    if (chapterIndex < currentChapterIndex) return "finished";
    if (chapterIndex === currentChapterIndex) return "current";
    return "locked";
}

type ProgressCursor = {
  currentTopicId: string;
  currentChapterId: string;
};

async function getCurrentTopicAndChapter(courseId: string): Promise<ProgressCursor> {
  const { getProgressStore } = await import("../database/progressStore");
  const store = await getProgressStore();
  const cached = store.get(courseId);

  // If we have a complete cached cursor, use it
  if (cached) {
    return cached;
  }

  // Otherwise, default to first topic and chapter
  const course = resolveCourse(courseId);
  const firstTopic = course.topics[0];
  const firstChapter = firstTopic?.chapters[0];

  const cursor: ProgressCursor = {
    currentTopicId: firstTopic?.topicId ?? "",
    currentChapterId: firstChapter?.chapterId ?? "",
  };

  store.set(courseId, cursor);
  return cursor;
}

/**
 * Update the current progress cursor for a course.
 * This is an admin-only function to advance chapters for all students.
 */
export async function setProgressCursor(
  courseId: CourseId,
  topicId: string,
  chapterId: string
): Promise<void> {
  const { setProgressInStore } = await import("../database/progressStore");
  await setProgressInStore(courseId, topicId, chapterId);
}

