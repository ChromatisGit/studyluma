import AccessSectionClient from "@/features/access/AccessSection";
import { isRegistrationOpen } from "@/server/auth/registrationWindow";
import { getCourseId } from "@/server/data/courses";
import { getCourseDTO } from "@/server/data/getCourseDTO";

type AccessPageProps = {
  searchParams?: {
    groupKey?: string | string[];
    subjectKey?: string | string[];
  };
};

function getSearchParam(value?: string | string[]) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default function AccessPage({ searchParams }: AccessPageProps) {
  const groupKey = getSearchParam(searchParams?.groupKey);
  const subjectKey = getSearchParam(searchParams?.subjectKey);
    const isCourseJoin = Boolean(groupKey && subjectKey);

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
    registrationOpen = isRegistrationOpen(courseId);
  }

  return (
    <AccessSectionClient
      isCourseJoin={isCourseJoin}
      groupKey={groupKey}
      courseId={courseId}
      courseRoute={courseRoute}
      courseName={courseName}
      isRegistrationOpen={registrationOpen}
    />
  );
}
