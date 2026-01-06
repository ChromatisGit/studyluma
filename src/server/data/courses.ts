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
  return notFound();
}

export function getCourseId(groupKey: string, subjectKey: string): CourseId {
  return ensureCourseId(`${groupKey}-${subjectKey}`);
}

export function getSubject(courseId: CourseId) {
  return resolveCourse(courseId).subject;
}

export function getTopic({ courseId, topicId }: { courseId: string; topicId: string }) {
  return getTopicData(resolveCourse(courseId), topicId) ?? notFound();
}

export function courseListed(courseId: CourseId) {
  return resolveCourse(courseId).isListed;
}

export function coursePublic(courseId: CourseId) {
  return resolveCourse(courseId).isPublic;
}

export function getCourseGroupAndSubjectKey(courseId: CourseId) {
  const course = resolveCourse(courseId)
  return {groupKey: course.group.key, subjectKey: course.subject.key} ;
}

export function getWorksheetRefs({
  courseId,
  topicId,
  chapterId,
}: {
  courseId: string;
  topicId: string;
  chapterId: string;
}) {
  const course = resolveCourse(courseId);
  const topic = getTopicData(course, topicId);
  const chapter = getChapterData(topic, chapterId);
  const worksheets = chapter?.worksheets;

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
  accessible: string[];
  restricted: string[];
  hidden: string[];
};

export function getCoursesByAccess(user: User): CourseAccessGroups {
  return courses.reduce<CourseAccessGroups>(
    (groups, course) => {
      if (!course.isListed) {
        if (isAdmin(user)) groups.hidden.push(course.id);

        return groups;
      }

      if (canUserAccessPage(user, course.group.id, course.id)) {
        groups.accessible.push(course.id);
        return groups;
      }

      groups.restricted.push(course.id);
      return groups;
    },
    { accessible: [], restricted: [], hidden: [] }
  );
}