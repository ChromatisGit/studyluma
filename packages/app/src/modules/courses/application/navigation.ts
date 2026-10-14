import type { ChapterInCourse, Course } from "../domain/course";

export function coursePath(courseId: string): string {
  return `/courses/${encodeURIComponent(courseId)}`;
}

export function courseOverviewPath(courseId: string): string {
  return `${coursePath(courseId)}/overview`;
}

export function courseStructurePath(courseId: string): string {
  return `${coursePath(courseId)}/course-structure`;
}

export function courseContentPath(courseId: string): string {
  return `${coursePath(courseId)}/content`;
}

/** The page of the chapter with this URL name. */
export function chapterPath(courseId: string, chapterSlug: string): string {
  return `${coursePath(courseId)}/chapters/${encodeURIComponent(chapterSlug)}`;
}

/** The page of a chapter given by id, as the course names it. */
export function chapterPathById(
  course: Pick<Course, "id" | "topics">,
  chapterId: string,
): string {
  const slug = course.topics
    .flatMap((topic) => topic.chapters)
    .find((chapter) => chapter.id === chapterId)?.slug;
  return slug === undefined
    ? coursePath(course.id)
    : chapterPath(course.id, slug);
}

/** All chapters in course order, with topic and position. */
export function chaptersInOrder(course: Course): ChapterInCourse[] {
  const flat = course.topics.flatMap((topic) =>
    topic.chapters.map((chapter) => ({ chapter, topic })),
  );
  const currentIndex = flat.findIndex(
    ({ chapter }) => chapter.id === course.currentChapterId,
  );
  return flat.map(({ chapter, topic }, index) => ({
    ...chapter,
    topic,
    index,
    reached: currentIndex < 0 || index <= currentIndex,
    current: index === currentIndex,
  }));
}

export function findChapter(
  course: Course,
  chapterId: string,
): ChapterInCourse | undefined {
  return chaptersInOrder(course).find((chapter) => chapter.id === chapterId);
}

export function findChapterBySlug(
  course: Course,
  slug: string,
): ChapterInCourse | undefined {
  return chaptersInOrder(course).find((chapter) => chapter.slug === slug);
}

/** Previous and next chapter in course order. */
export function neighbours(course: Course, chapterId: string) {
  const chapters = chaptersInOrder(course);
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  return {
    previous: index > 0 ? chapters[index - 1] : undefined,
    next: index >= 0 ? chapters[index + 1] : undefined,
  };
}
