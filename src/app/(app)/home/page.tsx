import { redirect } from "next/navigation";
import { getSession } from "@services/authService";
import { getSidebarDTO, getCourseDTOs, getProgressDTO } from "@services/courseService";
import { AuthenticatedHomePage } from "@features/home/AuthenticatedHomePage";

export const dynamic = "force-dynamic";

export default async function HomeRoute() {
  const session = await getSession();
  if (!session) redirect("/access");

  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });

  const courses = await getCourseDTOs(sidebarData.courses.map((c) => c.id));

  const firstCourse = sidebarData.courses[0] ?? null;
  const firstProgress = firstCourse ? await getProgressDTO(firstCourse.id, session.user) : null;
  const currentTopic = firstProgress?.topics.find((t) => t.topicId === firstProgress?.currentTopicId);
  const currentChapter = currentTopic?.chapters.find((c) => c.chapterId === firstProgress?.currentChapterId);
  const continueHref = currentChapter?.href ?? firstCourse?.href ?? "/practice";

  return (
    <AuthenticatedHomePage
      courses={courses}
      continueHref={continueHref}
      continueCourseName={firstCourse?.label ?? null}
      continueTopicName={currentTopic?.label ?? null}
      continueChapterName={currentChapter?.label ?? null}
      continueIcon={courses[0]?.icon ?? null}
      accessCode={sidebarData.accessCode ?? null}
    />
  );
}
