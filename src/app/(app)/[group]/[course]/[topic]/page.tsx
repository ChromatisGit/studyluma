import { getSession, assertCanAccessPage } from "@/server/auth/auth";
import { getCourseId, getTopic } from "@/server/data/courses";
import Link from "next/link";

type PageParams = {
  params: {
    groupKey: string;
    subjectKey: string;
    topicId: string;
  };
};

export default async function ChapterPage({ params }: PageParams) {
  const { groupKey, subjectKey, topicId } = params

  const session = await getSession();
  assertCanAccessPage(session, groupKey, subjectKey);

  const courseId = getCourseId(groupKey, subjectKey)
  const topic = getTopic({ courseId, topicId });

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{topic.label}</h1>
      <h2>Kapitelübersicht</h2>

      {topic.chapters.length > 0 ? (
        <ul>
          {topic.chapters.map((chapter) => (
            <li key={chapter.chapterId}>
              <Link href={chapter.href}>
                {chapter.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Dieses Thema hat noch keine Kapitel.</p>
      )}
    </main>
  );
}