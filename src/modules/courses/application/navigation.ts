import type { Chapter } from "../../content";

export type TopicGroup = {
  id: string;
  title: string;
  chapters: Chapter[];
};

export function groupChapters(chapters: Chapter[]): TopicGroup[] {
  const groups = new Map<string, TopicGroup>();
  for (const chapter of chapters) {
    let group = groups.get(chapter.topic_id);
    if (!group) {
      group = {
        id: chapter.topic_id,
        title: chapter.topic_title,
        chapters: [],
      };
      groups.set(chapter.topic_id, group);
    }
    group.chapters.push(chapter);
  }
  return [...groups.values()];
}

export function chapterPath(courseId: string, chapter: Chapter): string {
  return `/courses/${encodeURIComponent(courseId)}/topics/${encodeURIComponent(chapter.topic_id)}/chapters/${encodeURIComponent(chapter.id)}`;
}
