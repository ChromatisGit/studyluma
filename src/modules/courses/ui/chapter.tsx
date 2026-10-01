import type { Course } from "../application/queries";
import type { Chapter } from "../../content";
import { useLoaderData } from "react-router";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import {
  ActionCard,
  Badge,
  Breadcrumbs,
  Card,
  CardBody,
  Page,
  PageHeader,
  TextLink,
} from "@chromatis/base/ui";
import { MarkdownRenderer } from "../../content";
import type { Worksheet } from "../../worksheets";
import { chapterPath, groupChapters } from "../application/navigation";

export default function ChapterPage() {
  const { course, chapter, chapters, worksheets } = useLoaderData<{
    course: Course;
    chapter: Chapter;
    chapters: Chapter[];
    worksheets: Worksheet[];
  }>();
  const index = chapters.findIndex((item) => item.id === chapter.id);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];

  return (
    <Page title={chapter.title} width="wide" className="chapter-page">
      <PageHeader
        title={chapter.title}
        kicker={chapter.topic_title}
        breadcrumbs={
          <Breadcrumbs
            label="Brotkrumennavigation"
            items={[
              { label: "Meine Kurse", to: "/" },
              {
                label: course.title,
                to: `/courses/${encodeURIComponent(course.id)}`,
              },
              { label: chapter.title },
            ]}
          />
        }
      />
      {course.current_chapter_id === chapter.id && (
        <Badge status="info" className="chapter-current-badge">
          Aktuelles Kapitel
        </Badge>
      )}

      <div className="chapter-layout">
        <aside className="chapter-sidebar">
          <Card
            className="chapter-toc-card"
            surface="default"
            border="default"
          >
            <CardBody>
              <details className="chapter-toc" open>
                <summary className="chapter-toc__summary">
                  <span>
                    <span className="chapter-toc__eyebrow">Kursinhalt</span>
                    <span className="chapter-toc__title">{course.title}</span>
                  </span>
                  <ChevronDown className="icon" aria-hidden="true" />
                </summary>
                <nav aria-label="Kursnavigation">
                  {groupChapters(chapters).map((topic) => (
                    <div className="chapter-toc__group" key={topic.id}>
                      <h2>{topic.title}</h2>
                      <ul>
                        {topic.chapters.map((item) => (
                          <li key={item.id}>
                            <TextLink
                              className="chapter-toc__link"
                              to={chapterPath(course.id, item)}
                              aria-current={
                                item.id === chapter.id ? "page" : undefined
                              }
                              standalone
                            >
                              {item.title}
                            </TextLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </details>
            </CardBody>
          </Card>
        </aside>

        <div className="chapter-main">
          <Card
            className="chapter-reading-card"
            surface="default"
            border="default"
          >
            <CardBody>
              <MarkdownRenderer markdown={chapter.body} />
            </CardBody>
          </Card>

          <section className="chapter-worksheets" aria-labelledby="worksheets-title">
            <header className="chapter-worksheets__heading">
              <p>Weiterlernen</p>
              <h2 id="worksheets-title">Arbeitsblätter</h2>
            </header>
            <div className="chapter-worksheet-grid">
              {worksheets.map((worksheet) =>
                worksheet.is_locked ? (
                  <Card
                    className="chapter-worksheet-card chapter-worksheet-card--locked"
                    key={worksheet.id}
                    surface="default"
                    border="default"
                  >
                    <CardBody>
                      <span className="chapter-worksheet-card__eyebrow">
                        Arbeitsblatt
                      </span>
                      <span className="chapter-worksheet-card__title">
                        {worksheet.title}
                      </span>
                      <Badge status="warning">Gesperrt</Badge>
                    </CardBody>
                  </Card>
                ) : (
                  <ActionCard
                    className="chapter-worksheet-card"
                    to={`/w/${worksheet.public_key}`}
                    key={worksheet.id}
                  >
                    <CardBody>
                      <span className="chapter-worksheet-card__eyebrow">
                        Arbeitsblatt
                      </span>
                      <span className="chapter-worksheet-card__title">
                        {worksheet.title}
                      </span>
                      <span className="chapter-worksheet-card__action">
                        Öffnen <ArrowRight className="icon" aria-hidden="true" />
                      </span>
                    </CardBody>
                  </ActionCard>
                ),
              )}
            </div>
          </section>

          {(previous || next) && (
            <nav className="chapter-pagination" aria-label="Kapitel wechseln">
              {previous ? (
                <TextLink
                  className="chapter-pagination__link chapter-pagination__link--previous"
                  to={chapterPath(course.id, previous)}
                  standalone
                >
                  <ArrowLeft className="icon" aria-hidden="true" />
                  <span>
                    <span className="chapter-pagination__eyebrow">
                      Vorheriges Kapitel
                    </span>
                    <span className="chapter-pagination__title">
                      {previous.title}
                    </span>
                  </span>
                </TextLink>
              ) : (
                <span />
              )}
              {next && (
                <TextLink
                  className="chapter-pagination__link chapter-pagination__link--next"
                  to={chapterPath(course.id, next)}
                  standalone
                >
                  <span>
                    <span className="chapter-pagination__eyebrow">
                      Nächstes Kapitel
                    </span>
                    <span className="chapter-pagination__title">
                      {next.title}
                    </span>
                  </span>
                  <ArrowRight className="icon" aria-hidden="true" />
                </TextLink>
              )}
            </nav>
          )}
        </div>
      </div>
    </Page>
  );
}
