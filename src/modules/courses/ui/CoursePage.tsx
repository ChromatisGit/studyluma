import { Breadcrumbs, Page, PageHeader, Tabs } from "@chromatis/base/ui";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { fill } from "../../../helper/text";
import {
  chapterPath,
  courseContentPath,
  coursePath,
  courseOverviewPath,
  courseStructurePath,
} from "../application/navigation";
import type { Course, Topic } from "../domain/course";
import { CurrentLesson } from "./CurrentLesson";
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
  teacher?: boolean;
  teachingControls?: ReactNode;
  structureControls?: ReactNode;
  contents?: ReactNode;
  activeTab?: CourseTab;
}

type CourseTab = "overview" | "course-structure" | "content" | "student";

/** The course view: where the class is, and the Lernweg below. */
// eslint-disable-next-line max-lines-per-function
export function CoursePage({
  course,
  teacher = false,
  teachingControls,
  structureControls,
  contents,
  activeTab = "overview",
}: CoursePageProps) {
  const navigate = useNavigate();
  const tabLabel = {
    overview: "Übersicht",
    "course-structure": "Kursstruktur",
    content: "Inhalte",
    student: "Kursübersicht",
  }[activeTab];
  const studentView = (
    <>
      <CurrentLesson course={course} />
      <section className="stack stack-300" aria-labelledby="lernweg-title">
        <h2 id="lernweg-title" className="h2">
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
    </>
  );
  return (
    <Page
      title={course.title}
      width="content"
      className="course-detail stack stack-700"
    >
      <PageHeader
        title={course.title}
        breadcrumbs={
          <Breadcrumbs
            label={TEXT.breadcrumbs}
            items={[
              { label: course.title, to: coursePath(course.id) },
              { label: tabLabel },
            ]}
          />
        }
      />

      {teacher ? (
        <Tabs
          label="Kursansichten"
          value={activeTab}
          onValueChange={(value) => {
            if (
              value !== "overview" &&
              value !== "course-structure" &&
              value !== "content" &&
              value !== "student"
            ) {
              return;
            }
            if (value === "student") {
              void navigate(coursePath(course.id));
              return;
            }
            void navigate(
              value === "overview"
                ? courseOverviewPath(course.id)
                : value === "course-structure"
                  ? courseStructurePath(course.id)
                  : courseContentPath(course.id),
            );
          }}
          items={[
            {
              id: "overview",
              label: "Übersicht",
              content: activeTab === "overview" ? teachingControls : null,
            },
            {
              id: "course-structure",
              label: "Kursstruktur",
              content:
                activeTab === "course-structure" ? structureControls : null,
            },
            {
              id: "content",
              label: "Inhalte",
              content: activeTab === "content" ? contents : null,
            },
            {
              id: "student",
              label: "Schüleransicht",
              content: activeTab === "student" ? studentView : null,
            },
          ]}
        />
      ) : (
        studentView
      )}
    </Page>
  );
}
