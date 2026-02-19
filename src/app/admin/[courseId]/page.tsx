import { ensureCourseId, getSubject } from "@services/courseService";
import { getCourseDTO } from "@services/getCourseDTO";
import { getProgressDTO } from "@services/getProgressDTO";
import { AdminCourseDetail } from "@features/admin/AdminCourseDetail";
import { listSlideDecks } from "@services/slideService";

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

    const subject = getSubject(courseId);
    const slideIds = await listSlideDecks({
      subject: subject.id,
      topicId: progress.currentTopicId,
      chapterId: progress.currentChapterId,
    });

  return (
    <AdminCourseDetail
      course={course}
      progress={progress}
      courseId={validCourseId}
      slideIds={slideIds}
    />
  );
}

