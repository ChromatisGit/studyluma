import "server-only";
import type { CourseState } from "../repo/types";
import type { Course } from "@schema/course";
import coursesJson from "@generated/config/courses.json";
import { readJsonFile, writeJsonFile } from "./storage";

const coursesConfig = coursesJson as Course[];

type CourseRecord = {
  courseId: string;
  currentTopicId: string;
  currentChapterId: string;
  registrationOpenUntil: string | null; // ISO string for JSON serialization
};

const COURSES_FILE = "courses.json";

function getCourses(): CourseRecord[] {
  return readJsonFile<CourseRecord[]>(COURSES_FILE, []);
}

function saveCourses(courses: CourseRecord[]): void {
  writeJsonFile(COURSES_FILE, courses);
}

function toCourse(record: CourseRecord): CourseState {
  return {
    courseId: record.courseId,
    currentTopicId: record.currentTopicId,
    currentChapterId: record.currentChapterId,
    registrationOpenUntil: record.registrationOpenUntil
      ? new Date(record.registrationOpenUntil)
      : null,
  };
}

export async function getCourse(courseId: string): Promise<CourseState | null> {
  const courses = getCourses();
  const existing = courses.find((c) => c.courseId === courseId);
  if (existing) return toCourse(existing);

  // Auto-create from generated config on first read (dev convenience)
  const config = coursesConfig.find((c) => c.id === courseId);
  if (!config || config.topics.length === 0 || config.topics[0].chapters.length === 0) {
    return null;
  }

  const record: CourseRecord = {
    courseId,
    currentTopicId: config.topics[0].topicId,
    currentChapterId: config.topics[0].chapters[0].chapterId,
    registrationOpenUntil: null,
  };
  courses.push(record);
  saveCourses(courses);
  return toCourse(record);
}

export async function updateCourseProgress(
  courseId: string,
  topicId: string,
  chapterId: string
): Promise<void> {
  const courses = getCourses();
  const index = courses.findIndex((c) => c.courseId === courseId);

  if (index >= 0) {
    courses[index].currentTopicId = topicId;
    courses[index].currentChapterId = chapterId;
  } else {
    // Create course if it doesn't exist (for dev convenience)
    courses.push({
      courseId,
      currentTopicId: topicId,
      currentChapterId: chapterId,
      registrationOpenUntil: null,
    });
  }

  saveCourses(courses);
}

export async function setRegistrationOpenUntil(
  courseId: string,
  openUntil: Date | null
): Promise<void> {
  const courses = getCourses();
  const index = courses.findIndex((c) => c.courseId === courseId);

  if (index >= 0) {
    courses[index].registrationOpenUntil = openUntil?.toISOString() ?? null;
    saveCourses(courses);
  }
}
