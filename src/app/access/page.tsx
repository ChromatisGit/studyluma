import AccessSectionClient from "@features/access/AccessSection";
import { getCourseId } from "@services/courseService";
import { getCourseDTO } from "@services/getCourseDTO";
import { getSession } from "@services/authService";
import { isRegistrationOpen } from "@services/courseStateService";
import { getUserAccessCode } from "@services/userService";

type AccessPageProps = {
  searchParams?: Promise<{
    groupKey?: string | string[];
    subjectKey?: string | string[];
  }>;
};

function getSearchParam(value?: string | string[]) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const groupKey = getSearchParam(resolvedSearchParams?.groupKey);
  const subjectKey = getSearchParam(resolvedSearchParams?.subjectKey);
  const isCourseJoin = Boolean(groupKey && subjectKey);

  // Get current user's access code if logged in
  const session = await getSession();
  const currentUserAccessCode = session?.user
    ? await getUserAccessCode(session.user.id)
    : null;

  let courseId: string | null = null;
  let courseName = "this course";
  let courseRoute: string | null = null;
  let registrationOpen = false;

  if (isCourseJoin && groupKey && subjectKey) {
    const resolvedCourseId = getCourseId(groupKey, subjectKey);
    const course = getCourseDTO(resolvedCourseId);
    courseId = resolvedCourseId;
    courseName = course.label;
    courseRoute = course.slug;
    registrationOpen = await isRegistrationOpen(courseId);
  }

  return (
    <AccessSectionClient
      isCourseJoin={isCourseJoin}
      groupKey={groupKey}
      courseId={courseId}
      courseRoute={courseRoute}
      courseName={courseName}
      isRegistrationOpen={registrationOpen}
      currentUserAccessCode={currentUserAccessCode}
    />
  );
}

