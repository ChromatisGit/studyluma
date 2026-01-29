import "server-only";

import { ProgressChapterDTO, ProgressDTO, ProgressStatus, ProgressTopicDTO } from "@schema/progressDTO";
import { CourseId, resolveCourse } from "./courseService";
import { getCourseProgress } from "./courseStateService";

export async function getProgressDTO(courseId: CourseId): Promise<ProgressDTO> {
  const { topics } = resolveCourse(courseId);

  const { currentTopicId, currentChapterId } = await getCourseProgress(courseId);

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


