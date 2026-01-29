import { getSession, assertCanAccessPage } from "@services/authService";
import { getCourseId } from "@services/courseService";
import { getTopicDTO } from "@services/getTopicDTO";
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
  const courseId = getCourseId(groupKey, subjectKey);
  assertCanAccessPage(session, groupKey, courseId);

  const topic = await getTopicDTO({ courseId, topicId });

  return (
    <main>
      <PageHeader title={topic.label} subtitle="Kapitelübersicht" />

      {topic.chapters.length > 0 ? (
        <ul>
          {topic.chapters.map((chapter) => (
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

