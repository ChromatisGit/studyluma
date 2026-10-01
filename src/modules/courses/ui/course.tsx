import type { Course } from "../application/queries";
import type { Chapter } from "../../content";
import { useLoaderData } from "react-router";
import { ArrowRight } from "lucide-react";
import {
  Badge,
  Breadcrumbs,
  Card,
  CardBody,
  Page,
  PageHeader,
  TextLink,
} from "@chromatis/base/ui";
import { chapterPath, groupChapters } from "../application/navigation";

export default function CoursePage() {
  const { course, chapters, isTeacher } = useLoaderData<{
    course: Course;
    chapters: Chapter[];
    isTeacher: boolean;
  }>();
  return (
    <Page title={course.title} width="content" className="course-detail">
      <PageHeader
        title={course.title}
        breadcrumbs={
          <Breadcrumbs
            label="Brotkrumennavigation"
            items={[{ label: "Meine Kurse", to: "/" }, { label: course.title }]}
          />
        }
      />
      {isTeacher && (
        <div className="course-detail__tools">
          <TextLink
            to={`/courses/${encodeURIComponent(course.id)}/teacher`}
            standalone
          >
            Lehrkraft-Dashboard
          </TextLink>
        </div>
      )}
      <section className="course-topic-grid" aria-label="Themen und Kapitel">
        {groupChapters(chapters).map((topic, topicIndex) => (
          <Card
            className="course-topic-card"
            key={topic.id}
            surface="default"
            border="default"
            aria-labelledby={`topic-${topic.id}`}
          >
            <CardBody>
              <header className="course-topic-card__heading">
                <div>
                  <p className="course-topic-card__eyebrow">
                    Thema {String(topicIndex + 1).padStart(2, "0")}
                  </p>
                  <h2 id={`topic-${topic.id}`}>{topic.title}</h2>
                </div>
                <span className="course-topic-card__count">
                  {topic.chapters.length} Kapitel
                </span>
              </header>
              <ul className="course-chapter-list">
                {topic.chapters.map((chapter, chapterIndex) => (
                  <li key={chapter.id}>
                    <TextLink
                      className="course-chapter-link"
                      to={chapterPath(course.id, chapter)}
                      standalone
                    >
                      <span className="course-chapter-link__number">
                        {String(chapterIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="course-chapter-link__title">
                        {chapter.title}
                      </span>
                      {course.current_chapter_id === chapter.id ? (
                        <Badge status="info">Aktuelles Kapitel</Badge>
                      ) : (
                        <ArrowRight className="icon" aria-hidden="true" />
                      )}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </section>
    </Page>
  );
}
