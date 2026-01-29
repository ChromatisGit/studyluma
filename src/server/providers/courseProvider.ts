import "server-only";

import coursesJson from "@generated/config/courses.json";
import { Course } from "@schema/course";

export type CourseId = string;

const courses = coursesJson as Course[];

const coursesById = courses.reduce<Record<Course["id"], Course>>((acc, course) => {
  acc[course.id] = course;
  return acc;
}, {} as Record<Course["id"], Course>);

export function listCourses(): Course[] {
  return courses;
}

export function getCourseById(courseId: CourseId): Course | null {
  return coursesById[courseId as Course["id"]] ?? null;
}

export function courseIdExists(value: string): value is CourseId {
  return value in coursesById;
}
