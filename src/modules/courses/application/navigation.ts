import type { ChapterInCourse, Course } from "../domain/course";

export function coursePath(courseId: string): string {
  return `/courses/${encodeURIComponent(courseId)}`;
}

export function chapterPath(courseId: string, chapterId: string): string {
  return `${coursePath(courseId)}/chapters/${encodeURIComponent(chapterId)}`;
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

/** Previous and next chapter in course order. */
export function neighbours(course: Course, chapterId: string) {
  const chapters = chaptersInOrder(course);
  const index = chapters.findIndex((chapter) => chapter.id === chapterId);
  return {
    previous: index > 0 ? chapters[index - 1] : undefined,
    next: index >= 0 ? chapters[index + 1] : undefined,
  };
}
