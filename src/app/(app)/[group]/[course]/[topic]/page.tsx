import { getSession, assertCanAccessPage } from "@services/authService";
import { getCourseId, coursePublic } from "@services/courseService";
import { getTopicDTO } from "@services/courseService";
import type { ProgressChapterDTO } from "@schema/courseTypes";
import { PageHeader } from "@components/PageHeader/PageHeader";
import { AppLink } from "@components/AppLink";
import styles from "./page.module.css";

type PageParams = {
  params: Promise<{
    group: string;
    course: string;
    topic: string;
  }>;
};

export default async function ChapterPage({ params }: PageParams) {
  const { group: groupKey, course: subjectKey, topic: topicId } = await params;

  const session = await getSession();
  const user = session?.user ?? null;
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);

  const topic = await getTopicDTO({ courseId, topicId, user });

  return (
    <main>
      <PageHeader title={topic.label} subtitle="Kapitelübersicht" />

      {topic.chapters.length > 0 ? (
        <ul>
          {topic.chapters.map((chapter: ProgressChapterDTO) => (
            <li key={chapter.chapterId}>
              {chapter.status === "locked" ? (
                chapter.label
              ) : (
                <AppLink href={chapter.href} className={styles.chapterLink}>{chapter.label}</AppLink>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Dieses Thema hat noch keine Kapitel.</p>
      )}
    </main>
  );
}

