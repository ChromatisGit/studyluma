import type { Course } from "../application/queries";
import { Form, useLoaderData } from "react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import {
  ActionCard,
  Button,
  CardBody,
  EmptyState,
  Page,
  PageHeader,
  TextLink,
} from "@chromatis/base/ui";

export default function Home() {
  const { courses, isTeacher } = useLoaderData<{
    courses: Course[];
    isTeacher: boolean;
  }>();
  return (
    <Page title="Meine Kurse" width="content" className="course-home">
      <PageHeader title="Meine Kurse" />
      {courses.length ? (
        <section className="course-grid" aria-label="Meine Kurse">
          {courses.map((course) => (
            <div className="course-tile" key={course.id}>
              <ActionCard
                className="course-home-card"
                to={`/courses/${encodeURIComponent(course.id)}`}
              >
                <CardBody>
                  <span className="course-card__eyebrow">
                    <BookOpen className="icon" aria-hidden="true" />
                    Lernweg
                  </span>
                  <h2 className="course-card__title">{course.title}</h2>
                  <span className="course-card__action">
                    Kurs öffnen <ArrowRight className="icon" aria-hidden="true" />
                  </span>
                </CardBody>
              </ActionCard>
              {isTeacher && (
                <TextLink
                  className="course-teacher-link"
                  to={`/courses/${encodeURIComponent(course.id)}/teacher`}
                  standalone
                >
                  Lehrkraft-Dashboard
                </TextLink>
              )}
            </div>
          ))}
        </section>
      ) : (
        <EmptyState
          title="Keine Kurse"
          description="Du bist noch in keinem Kurs eingeschrieben."
          nextStep="Bitte deine Lehrkraft um eine Kurseinladung."
        />
      )}
      <Form className="course-home__account" method="post" action="/logout">
        <Button type="submit" role="ghost">
          Abmelden
        </Button>
      </Form>
    </Page>
  );
}
