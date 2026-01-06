import { GeneratedPage } from "@components/GeneratedPage/GeneratedPage";
import { getPage } from "@/server/data/getPage";
import { getSession, assertCanAccessPage } from "@/server/auth/auth";
import { getCourseId, getSubject } from "@/server/data/courses";

type PageParams = {
  params: {
    groupKey: string;
    subjectKey: string;
    topicId: string;
    chapterId: string;
    worksheetId: string;
  };
};

export default async function WorksheetRoute({ params }: PageParams) {
  const {groupKey, subjectKey, topicId, chapterId, worksheetId} = params

  const session = await getSession();
  assertCanAccessPage(session, groupKey, subjectKey );

  const courseId = getCourseId(groupKey, subjectKey)
  const subject = getSubject(courseId)
  const page = await getPage({subject: subject.id, topicId, chapterId, worksheetId});

  return <GeneratedPage title={page.title} content={page.content} />;
}

