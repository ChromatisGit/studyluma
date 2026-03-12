import { redirect } from "next/navigation";
import AccessSectionClient from "@features/access/AccessSection";
import { CoursePicker } from "@features/access/CoursePicker";
import { getCourseId, getCourseDTO, isRegistrationOpen, getCoursesByAccess } from "@services/courseService";
import { getSession } from "@services/authService";
import { joinCourseAction } from "@actions/accessActions";


type AccessPageProps = {
  searchParams?: Promise<{
    groupKey?: string | string[];
    subjectKey?: string | string[];
    join?: string | string[];
    from?: string | string[];
  }>;
};

function getSearchParam(value?: string | string[]) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Allow only internal paths to prevent open-redirect attacks. */
function sanitizeFrom(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const groupKey = getSearchParam(resolvedSearchParams?.groupKey);
  const subjectKey = getSearchParam(resolvedSearchParams?.subjectKey);
  const from = sanitizeFrom(getSearchParam(resolvedSearchParams?.from));
  const joinParam = getSearchParam(resolvedSearchParams?.join);

  const isCourseJoin = Boolean(groupKey && subjectKey);
  const isCoursePicker = joinParam === "1";

  const session = await getSession();

  // Authenticated users
  if (session?.user) {
    // Auto-enroll for direct course join links — joinCourseAction redirects internally
    if (isCourseJoin && groupKey && subjectKey) {
      const resolvedCourseId = await getCourseId(groupKey, subjectKey);
      await joinCourseAction(resolvedCourseId);
    }
    if (isCoursePicker) {
      const accessGroups = await getCoursesByAccess(session.user);
      const allNonPublicIds = [...accessGroups.accessible, ...accessGroups.restricted].filter(
        (id) => !session.user.courseIds.includes(id)
      );
      const courses = await Promise.all(allNonPublicIds.map((id) => getCourseDTO(id)));
      return <CoursePicker courses={courses} />;
    }
    redirect("/");
  }

  // Course picker for unauthenticated users
  if (isCoursePicker) {
    const accessGroups = await getCoursesByAccess(null);
    const courses = await Promise.all(accessGroups.restricted.map((id) => getCourseDTO(id)));
    return <CoursePicker courses={courses} />;
  }

  // Course join form (specific course in URL)
  const currentUserAccessCode = null; // user is not authenticated at this point

  let courseId: string | null = null;
  let courseName = "this course";
  let courseRoute: string | null = null;
  let registrationOpen = false;

  if (isCourseJoin && groupKey && subjectKey) {
    const resolvedCourseId = await getCourseId(groupKey, subjectKey);
    const course = await getCourseDTO(resolvedCourseId);
    courseId = resolvedCourseId;
    courseName = course.label;
    courseRoute = course.slug;
    registrationOpen = await isRegistrationOpen(courseId);
  }

  return (
    <AccessSectionClient
      showRegister={isCourseJoin}
      isCourseJoin={isCourseJoin}
      groupKey={groupKey}
      courseId={courseId}
      courseRoute={courseRoute}
      courseName={courseName}
      isRegistrationOpen={registrationOpen}
      currentUserAccessCode={currentUserAccessCode}
      from={from}
    />
  );
}
