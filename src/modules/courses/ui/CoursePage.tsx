import {
  Breadcrumbs,
  Card,
  CardBody,
  Page,
  PageHeader,
  TextLink,
} from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import { chapterPath, chaptersInOrder } from "../application/navigation";
import type { Course, Topic } from "../domain/course";
import { Lernweg, type LernwegPhase, type LernwegTopic } from "./Lernweg";
import TEXT from "./courses.de.json";

function lernwegTopic(course: Course, topic: Topic): LernwegTopic {
  return {
    id: topic.id,
    number: topic.number,
    title: topic.title,
    pictogram: topic.icon,
    chapters: topic.chapters.map((chapter) => ({
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      to: chapterPath(course.id, chapter.id),
    })),
  };
}

/** School years as Lernweg phases; topics no phase mentions join the last. */
function lernwegPhases(course: Course): LernwegPhase[] {
  const topics = course.topics.map((topic) => lernwegTopic(course, topic));
  const { phases } = course;
  if (!phases.length) {
    return [{ id: "course", label: course.title, topics }];
  }
  return phases.map((phase, index) => ({
    id: phase.id,
    label: phase.label,
    topics: topics.filter(
      (topic) =>
        phase.topicIds.includes(topic.id) ||
        (index === phases.length - 1 &&
          !phases.some((other) => other.topicIds.includes(topic.id))),
    ),
  }));
}

export interface CoursePageProps {
  course: Course;
  homeLabel: string;
  homePath: string;
}

/** The course view: where the class is, and the Lernweg below. */
export function CoursePage({ course, homeLabel, homePath }: CoursePageProps) {
  const chapters = chaptersInOrder(course);
  const currentIndex = chapters.findIndex((chapter) => chapter.current);
  const current = chapters[currentIndex];
  const previous = currentIndex > 0 ? chapters[currentIndex - 1] : undefined;

  return (
    <Page
      title={course.title}
      width="content"
      className="course-detail stack stack-700"
    >
      <PageHeader
        title={course.title}
        kicker={course.subject}
        breadcrumbs={
          <Breadcrumbs
            label={TEXT.breadcrumbs}
            items={[
              { label: homeLabel, to: homePath },
              { label: course.title },
            ]}
          />
        }
      />

      {current && (
        <Card
          className="lernweg-board"
          surface="accent"
          aria-label={TEXT.board.label}
        >
          <CardBody>
            <div className="lernweg-board__stop">
              <span className="lernweg-board__label">{TEXT.board.current}</span>
              <TextLink
                className="lernweg-board__title"
                to={chapterPath(course.id, current.id)}
              >
                {current.number} {current.title}
              </TextLink>
              <span className="lernweg-board__sub">{current.topic.title}</span>
            </div>
            {previous && (
              <div className="lernweg-board__stop">
                <span className="lernweg-board__label">
                  {TEXT.board.previous}
                </span>
                <TextLink
                  className="lernweg-board__title"
                  to={chapterPath(course.id, previous.id)}
                >
                  {previous.number} {previous.title}
                </TextLink>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <section className="stack stack-300" aria-labelledby="lernweg-title">
        <h2 id="lernweg-title" className="h3">
          {TEXT.lernweg.heading}
        </h2>
        <Lernweg
          label={fill(TEXT.lernweg.label, { course: course.title })}
          badge={course.badge}
          badgeLabel={course.title}
          phases={lernwegPhases(course)}
          currentChapterId={course.currentChapterId}
        />
      </section>
    </Page>
  );
}
