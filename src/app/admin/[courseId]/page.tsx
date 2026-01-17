import { ensureCourseId } from "@/server/data/courses";
import { getCourseDTO } from "@/server/data/getCourseDTO";
import { getProgressDTO } from "@/server/data/getProgressDTO";
import { AdminCourseDetail } from "@/features/admin/AdminCourseDetail";

type PageParams = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function AdminCourseDetailPage({ params }: PageParams) {
  const { courseId } = await params;

  const validCourseId = ensureCourseId(courseId);
  const course = getCourseDTO(validCourseId);
  const progress = await getProgressDTO(validCourseId);

  return (
    <AdminCourseDetail
      course={course}
      progress={progress}
      courseId={validCourseId}
    />
  );
}
