import type { CoursePlan } from "@schema/coursePlan";
import type { GroupsAndSubjects } from "@schema/groupsAndSubjects";
import type { TopicPlan } from "@schema/topicPlan";
import type { Status } from "@schema/overview";
import type { AccentColor } from "@schema/colors";
import { WorksheetRef } from "@worksheet/worksheetFiles";

export type ResolvedCourseChapter = {
  chapter: string;
  slug: string;
  label: string;
  status: Status;
  worksheets: WorksheetRef[];
}

export type ResolvedCourseTopic = {
  topic: string;
  label: string;
  status: Status;
  chapters: ResolvedCourseChapter[];
};

export type WorksheetFormat = "web" | "pdf";

export type ResolvedCourse = {
  group: { id: string; label: string; color: AccentColor };
  subject: { id: string; label: string; icon: string };
  courseVariant?: { id: string; label: string; short: string };
  slug: string;
  currentChapter?: CurrentChapter;
  worksheetFormat: WorksheetFormat;
  topics: ResolvedCourseTopic[];
};

type CurrentChapter = { id: string; label: string; worksheets: WorksheetRef[] };

export function prepareCourses(
  courses: CoursePlan[],
  groupsAndSubjects: GroupsAndSubjects,
  topics: Record<string, TopicPlan>,
): ResolvedCourse[] {
  const labeledCourses = labelCourses(courses, topics);

  return labeledCourses.map((course) => {
    const groupId = course.group.replace(/[0-9]/g, "");
    const groupEntry = groupsAndSubjects.groups[groupId]!;
    const subjectEntry = groupsAndSubjects.subjects[course.subject]!;
    const variantEntry = course.courseVariant
      ? groupsAndSubjects.variants[course.courseVariant]
      : undefined;

    const { topics: preparedTopics, currentChapter } = computePreparedTopics(course);

    return {
      group: { id: course.group, label: groupEntry.name, color: groupEntry.color },
      subject: { id: course.subject, label: subjectEntry.name, icon: subjectEntry.icon },
      courseVariant: variantEntry
        ? { id: course.courseVariant!, label: variantEntry.name, short: variantEntry.short }
        : undefined,
      slug: course.slug,
      currentChapter,
      worksheetFormat: course.worksheetFormat,
      topics: preparedTopics
    };
  });
}

function labelCourses(
  courses: CoursePlan[],
  topics: Record<string, TopicPlan>,
): CoursePlan[] {
  return courses.map((course) => ({
    ...course,
    topics: course.topics.map((topic) => {
      const topicDef = topics[topic.topic];
      return {
        ...topic,
        label: topicDef?.title ?? topic.label,
        chapters: topic.chapters.map((ch) => {
          const chapterDef = topicDef?.chapters.find((c) => c.id === ch.chapter);
          return {
            ...ch,
            label: chapterDef?.title ?? ch.label,
          };
        }),
      };
    }),
  }));
}

function computePreparedTopics(course: CoursePlan): {
  topics: ResolvedCourseTopic[];
  currentChapter?: CurrentChapter;
} {
  let currentChapter: CurrentChapter | undefined;
  const currentTopicIndex = findCurrentTopicIndex(course);
  const currentChapterId = course.currentChapter ?? undefined;

  const topics = course.topics.map((topic, topicIndex) => {
    const topicStatus = statusFromRelativeIndex(topicIndex - currentTopicIndex);

    if (topicStatus === "locked") {
      return {
        topic: topic.topic,
        label: topic.label,
        status: topicStatus,
        chapters: [],
      };
    }

    const visibleChapters = ensureVisibleChapters(
      selectChaptersForTopic(topic, topicStatus),
      topic,
    );

    const currentChapterIndex =
      topicStatus === "current" && currentChapterId
        ? visibleChapters.findIndex((ch) => ch.chapter === currentChapterId)
        : -1;

    const chapters = visibleChapters.map((chapter, chapterIndex) => {
      const status = chapterStatusForTopic(topicStatus, chapterIndex, currentChapterIndex);

      const worksheets: WorksheetRef[] = [];
      const resolvedChapter = {
        chapter: chapter.chapter,
        slug: chapterSlug(chapter.chapter),
        label: chapter.label,
        status,
        worksheets,
      };

      if (status === "current") {
        currentChapter = {
          id: resolvedChapter.chapter,
          label: resolvedChapter.label,
          worksheets,
        };
      }

      return resolvedChapter;
    });

    return {
      topic: topic.topic,
      label: topic.label,
      status: topicStatus,
      chapters,
    };
  });

  return { topics, currentChapter };
}

function statusFromRelativeIndex(relativeIndex: number): Status {
  if (relativeIndex < 0) return "finished";
  if (relativeIndex === 0) return "current";
  if (relativeIndex === 1) return "planned";
  return "locked";
}

function findCurrentTopicIndex(course: CoursePlan): number {
  if (!course.currentChapter) return 0;

  const currentTopicIndex = course.topics.findIndex((topic) =>
    topic.chapters.some((ch) => ch.chapter === course.currentChapter),
  );

  return currentTopicIndex === -1 ? 0 : currentTopicIndex;
}

function selectChaptersForTopic(
  topic: CoursePlan["topics"][number],
  topicStatus: Status,
) {
  if (topicStatus === "planned") {
    return topic.chapters.slice(0, 2).map(cloneChapter);
  }

  return topic.chapters.map(cloneChapter);
}

function cloneChapter(chapter: CoursePlan["topics"][number]["chapters"][number]) {
  return { ...chapter };
}

function ensureVisibleChapters(
  chapters: ReturnType<typeof selectChaptersForTopic>,
  topic: CoursePlan["topics"][number],
) {
  if (chapters.length > 0) {
    return chapters;
  }

  return [
    {
      topic: topic.topic,
      chapter: topic.topic,
      label: topic.label,
    },
  ];
}

const CHAPTER_SLUG_REGEX = /^\d{2}_(.+)$/;
function chapterSlug(chapterId: string): string {
  const match = CHAPTER_SLUG_REGEX.exec(chapterId);
  return match ? match[1] : chapterId;
}

function chapterStatusForTopic(
  topicStatus: Status,
  chapterIndex: number,
  currentChapterIndex: number,
): Status {
  if (topicStatus === "finished") return "finished";
  if (topicStatus === "planned") return "planned";

  if (chapterIndex < currentChapterIndex) return "finished";
  if (chapterIndex === currentChapterIndex) return "current";
  return "planned";
}