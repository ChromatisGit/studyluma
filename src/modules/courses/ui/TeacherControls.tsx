import { Form } from "react-router";
import type { Chapter } from "../../content";
import type { Course, TeacherWorksheet } from "../application/queries";

export type TeacherControlChapter = Pick<Chapter, "id" | "title">;
export type TeacherControlWorksheet = Pick<
  TeacherWorksheet,
  "id" | "title" | "chapter_title" | "is_locked"
>;

export function TeacherControls({
  course,
  chapters,
  worksheets,
  action,
}: {
  course: Pick<Course, "current_chapter_id">;
  chapters: TeacherControlChapter[];
  worksheets: TeacherControlWorksheet[];
  action: string;
}) {
  return (
    <>
      <section aria-labelledby="current-chapter-heading">
        <h2 id="current-chapter-heading">Aktuelles Kapitel</h2>
        {chapters.map((chapter) => (
          <Form method="post" action={action} key={chapter.id} className="card">
            <span>{chapter.title}</span>{" "}
            {course.current_chapter_id === chapter.id ? (
              <strong>Aktuell</strong>
            ) : (
              <button type="submit" name="chapterId" value={chapter.id}>
                Als aktuelles Kapitel setzen
              </button>
            )}
          </Form>
        ))}
      </section>
      <section aria-labelledby="worksheet-locks-heading">
        <h2 id="worksheet-locks-heading">Arbeitsblätter</h2>
        {worksheets.map((worksheet) => (
          <Form
            method="post"
            action={action}
            key={worksheet.id}
            className="card"
          >
            <span>
              {worksheet.chapter_title}: {worksheet.title} –{" "}
              {worksheet.is_locked ? "Gesperrt" : "Freigegeben"}
            </span>{" "}
            <input type="hidden" name="worksheetId" value={worksheet.id} />
            <button
              type="submit"
              name="locked"
              value={worksheet.is_locked ? "false" : "true"}
            >
              {worksheet.is_locked ? "Freigeben" : "Sperren"}
            </button>
          </Form>
        ))}
      </section>
    </>
  );
}
