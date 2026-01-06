import { GeneratedPage } from "@/components/GeneratedPage/GeneratedPage";
import { WorksheetCards } from "@/features/coursepage/components/WorksheetCard/WorksheetCards";
import { assertCanAccessPage, getSession } from "@/server/auth/auth";
import { getCourseId, getSubject, getWorksheetRefs } from "@/server/data/courses";
import { getPage } from "@/server/data/getPage";


type PageParams = {
  params: {
    groupKey: string;
    subjectKey: string;
    topicId: string;
    chapterId: string;
  };
};

export default async function ChapterPage({ params }: PageParams) {
  const { groupKey, subjectKey, topicId, chapterId } = params

  const session = await getSession();
  assertCanAccessPage(session, groupKey, subjectKey);

  const courseId = getCourseId(groupKey, subjectKey)
  const subject = getSubject(courseId)
  const page = await getPage({ subject: subject.id, topicId, chapterId });
  const worksheets = getWorksheetRefs({ courseId, topicId, chapterId });

  return (
    <main style={{ padding: "2rem" }}>
      {worksheets && (
        <WorksheetCards worksheets={worksheets} />
      )}

      <GeneratedPage
        title={page.title}
        content={page.content}
      />
    </main>
  );
}

