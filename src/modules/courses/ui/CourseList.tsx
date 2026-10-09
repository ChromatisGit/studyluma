import { ArrowRight } from "lucide-react";
import { EmptyState, Page, PageHeader } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import {
  chaptersInOrder,
  courseOverviewPath,
  coursePath,
} from "../application/navigation";
import type { Course } from "../domain/course";
import { LinkCard } from "./LinkCard";
import { Pictogram } from "./Pictogram";
import TEXT from "./courses.de.json";

/** "Meine Kurse": the start page with one card per course. */
export function CourseList({
  courses,
  teacher = false,
}: {
  courses: Course[];
  teacher?: boolean;
}) {
  return (
    <Page title={TEXT.home.title} width="content">
      <PageHeader title={TEXT.home.title} lead={TEXT.home.lead} />
      {courses.length === 0 ? (
        <EmptyState
          title={TEXT.home.empty}
          description={TEXT.home.emptyText}
          nextStep={TEXT.home.emptyNext}
        />
      ) : (
        <div className="course-grid">
          {courses.map((course) => {
            const current = chaptersInOrder(course).find(
              (chapter) => chapter.current,
            );
            return (
              <LinkCard
                key={course.id}
                to={
                  teacher
                    ? courseOverviewPath(course.id)
                    : coursePath(course.id)
                }
                title={course.title}
                cue={<ArrowRight className="card__cue" aria-hidden="true" />}
              >
                {current && (
                  <span className="course-card__current">
                    <Pictogram
                      icon={current.topic.icon}
                      fallbackLabel={current.topic.title}
                    />
                    {fill(TEXT.home.currentChapter, {
                      number: current.number,
                      title: current.title,
                    })}
                  </span>
                )}
              </LinkCard>
            );
          })}
        </div>
      )}
    </Page>
  );
}
