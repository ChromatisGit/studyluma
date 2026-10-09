import type { Catalog } from "../../catalog";
import type { Course } from "./course";

const badgeOf = (title: string) =>
  title
    .split(/\s+/)
    .map((word) => word.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

/**
 * The courses of a catalog: each course file lists topics and chapters in
 * their order. Numbers count topics and the chapters within them.
 */
export function coursesFromCatalog(catalog: Catalog): Course[] {
  return catalog.courses.map((definition) => {
    const topics = definition.topics.flatMap((entry, topicIndex) => {
      const topic = catalog.topics.find((item) => item.id === entry.topicId);
      if (!topic) {
        return [];
      }
      const number = String(topicIndex + 1);
      return [
        {
          id: topic.folder,
          number,
          title: topic.title,
          ...(topic.icon ? { icon: topic.icon } : {}),
          chapters: entry.chapterIds.flatMap((chapterId, chapterIndex) => {
            const chapter = catalog.chapters.find((c) => c.id === chapterId);
            return chapter
              ? [
                  {
                    id: chapter.id,
                    number: `${number}.${chapterIndex + 1}`,
                    title: chapter.title,
                  },
                ]
              : [];
          }),
        },
      ];
    });
    return {
      id: definition.id,
      title: definition.title,
      badge: badgeOf(definition.title),
      currentChapterId: topics[0]?.chapters[0]?.id ?? null,
      phases: [],
      topics,
    };
  });
}
