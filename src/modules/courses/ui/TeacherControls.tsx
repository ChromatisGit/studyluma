import { Form } from "react-router";
import { Badge, Button, Card, CardBody } from "@chromatis/base/ui";
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
    <div className="teacher-controls">
      <section
        className="teacher-control-section"
        aria-labelledby="current-chapter-heading"
      >
        <header className="teacher-control-section__heading">
          <p>Steuerung</p>
          <h2 id="current-chapter-heading">Aktuelles Kapitel</h2>
        </header>
        <div className="teacher-control-grid">
          {chapters.map((chapter) => {
            const isCurrent = course.current_chapter_id === chapter.id;
            return (
              <Card
                className="teacher-control-card"
                key={chapter.id}
                surface={isCurrent ? "accent" : "default"}
                border={isCurrent ? "strong" : "default"}
              >
                <CardBody className="teacher-control-card__body">
                  <span className="teacher-control-card__eyebrow">Kapitel</span>
                  <strong className="teacher-control-card__title">
                    {chapter.title}
                  </strong>
                  <Form
                    className="teacher-control-form"
                    method="post"
                    action={action}
                  >
                    {isCurrent ? (
                      <Badge status="info">Aktuell</Badge>
                    ) : (
                      <Button
                        type="submit"
                        role="secondary"
                        blockMobile
                        name="chapterId"
                        value={chapter.id}
                      >
                        Als aktuelles Kapitel setzen
                      </Button>
                    )}
                  </Form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <section
        className="teacher-control-section"
        aria-labelledby="worksheet-locks-heading"
      >
        <header className="teacher-control-section__heading">
          <p>Freigabe</p>
          <h2 id="worksheet-locks-heading">Arbeitsblätter</h2>
        </header>
        <div className="teacher-control-grid">
          {worksheets.map((worksheet) => (
            <Card
              className="teacher-control-card"
              key={worksheet.id}
              surface="default"
              border="default"
            >
              <CardBody className="teacher-control-card__body">
                <span className="teacher-control-card__eyebrow">
                  {worksheet.chapter_title}
                </span>
                <strong className="teacher-control-card__title">
                  {worksheet.title}
                </strong>
                <Form
                  className="teacher-control-form"
                  method="post"
                  action={action}
                >
                  <input
                    type="hidden"
                    name="worksheetId"
                    value={worksheet.id}
                  />
                  <Badge status={worksheet.is_locked ? "warning" : "success"}>
                    {worksheet.is_locked ? "Gesperrt" : "Freigegeben"}
                  </Badge>
                  <Button
                    type="submit"
                    role="secondary"
                    blockMobile
                    name="locked"
                    value={worksheet.is_locked ? "false" : "true"}
                  >
                    {worksheet.is_locked ? "Freigeben" : "Sperren"}
                  </Button>
                </Form>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
