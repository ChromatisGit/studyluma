import { useLoaderData } from "react-router";
import { Breadcrumbs, Page, PageHeader } from "@chromatis/base/ui";
import type { Chapter } from "../../content";
import type { Course, TeacherWorksheet } from "../application/queries";
import { TeacherControls } from "./TeacherControls";

export default function TeacherPage() {
  const { course, chapters, worksheets } = useLoaderData<{
    course: Course;
    chapters: Chapter[];
    worksheets: TeacherWorksheet[];
  }>();
  return (
    <Page
      title={`Lehrkraft-Dashboard: ${course.title}`}
      width="content"
      className="teacher-page"
    >
      <PageHeader
        title={`Lehrkraft-Dashboard: ${course.title}`}
        breadcrumbs={
          <Breadcrumbs
            label="Brotkrumennavigation"
            items={[
              { label: "Meine Kurse", to: "/" },
              {
                label: course.title,
                to: `/courses/${encodeURIComponent(course.id)}`,
              },
              { label: "Lehrkraft-Dashboard" },
            ]}
          />
        }
      />
      <TeacherControls
        course={course}
        chapters={chapters}
        worksheets={worksheets}
        action={`/courses/${encodeURIComponent(course.id)}/teacher`}
      />
    </Page>
  );
}
