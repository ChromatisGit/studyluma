import "server-only";

import coursesJson from "@generated/config/courses.json";
import { Course } from "@/server/schema/course";
import { canUserAccessPage } from "@auth/auth";
import { isAdmin, User } from "@/domain/userTypes";
import { notFound } from "next/navigation";
import { Chapter, Topic } from "@/domain/courseContent";

const courses = coursesJson as Course[];

const coursesById = courses.reduce<Record<Course["id"], Course>>((acc, course) => {
  acc[course.id] = course;
  return acc;
}, {} as Record<Course["id"], Course>);

export type CourseId = string

export function ensureCourseId(value: string): CourseId {
  if (value in coursesById) return value as CourseId;
  notFound();
}

export function getCourseId(groupKey: string, subjectKey: string): CourseId {
  return ensureCourseId(`${groupKey}-${subjectKey}`);
}

export function getSubject(courseId: CourseId) {
  return resolveCourse(courseId).subject;
}

export function getTopic({ courseId, topicId }: { courseId: string; topicId: string }) {
  const topic = getTopicData(resolveCourse(courseId), topicId);
  if (!topic) notFound();
  return topic;
}

export function courseListed(courseId: CourseId) {
  return resolveCourse(courseId).isListed;
}

export function coursePublic(courseId: CourseId) {
  return resolveCourse(courseId).isPublic;
}

export function getCourseGroupAndSubjectKey(courseId: CourseId) {
  const course = resolveCourse(courseId)
  return { groupKey: course.group.key, subjectKey: course.subject.key };
}

export async function getWorksheetRefs({
  courseId,
  topicId,
  chapterId,
}: {
  courseId: string;
  topicId: string;
  chapterId: string;
}) {
  // Import getProgressDTO to check chapter access
  const { getProgressDTO } = await import("./getProgressDTO");
  const progressDTO = await getProgressDTO(courseId);

  // Find the topic and chapter in the progress data
  const topic = progressDTO.topics.find((t) => t.topicId === topicId);
  const chapter = topic?.chapters.find((c) => c.chapterId === chapterId);

  // If chapter is locked or doesn't exist, return null
  if (!chapter || chapter.status === "locked") {
    return null;
  }

  // Chapter is accessible, get worksheets from raw course data
  const course = resolveCourse(courseId);
  const rawTopic = getTopicData(course, topicId);
  const rawChapter = getChapterData(rawTopic, chapterId);
  const worksheets = rawChapter?.worksheets;

  if (!worksheets || worksheets.length === 0) return null;
  return worksheets;
}

export function resolveCourse(courseId: CourseId): Course {
  return coursesById[courseId as Course["id"]]
}

function getTopicData(course: Course | null, topicId: string): Topic | null {
  if (!course) return null;
  return course.topics.find((item) => item.topicId === topicId) ?? null;
}

function getChapterData(topic: Topic | null, chapterId: string): Chapter | null {
  if (!topic) return null;
  return topic.chapters.find((item) => item.chapterId === chapterId) ?? null;
}

type CourseAccessGroups = {
  public: string[];
  accessible: string[];
  restricted: string[];
  hidden: string[];
};

export function getCoursesByAccess(user: User | null): CourseAccessGroups {
  return courses.reduce<CourseAccessGroups>(
    (groups, course) => {
      if (!course.isListed) {
        if (user && isAdmin(user)) groups.hidden.push(course.id);

        return groups;
      }

      if(course.isPublic) {
        groups.public.push(course.id);
        return groups;
      }

      if (canUserAccessPage(user, course.group.key, course.id)) {
        groups.accessible.push(course.id);
        return groups;
      }

      groups.restricted.push(course.id);
      return groups;
    },
    { public: [], accessible: [], restricted: [], hidden: [] }
  );
}
