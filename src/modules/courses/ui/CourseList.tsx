import { ArrowRight } from "lucide-react";
import { EmptyState, Page, PageHeader } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import { chaptersInOrder, coursePath } from "../application/navigation";
import type { Course } from "../domain/course";
import { LinkCard } from "./LinkCard";
import { Pictogram } from "./Pictogram";
import TEXT from "./courses.de.json";

/** "Meine Kurse": the start page with one card per course. */
export function CourseList({ courses }: { courses: Course[] }) {
  return (
    <Page title={TEXT.home.title} width="content">
      <PageHeader title={TEXT.home.title} lead={TEXT.home.lead} />
      {courses.length === 0 ? (
        <EmptyState title={TEXT.home.empty} />
      ) : (
        <div className="course-grid">
          {courses.map((course) => {
            const current = chaptersInOrder(course).find(
              (chapter) => chapter.current,
            );
            return (
              <LinkCard
                key={course.id}
                to={coursePath(course.id)}
                meta={course.subject}
                title={course.title}
                cue={<ArrowRight className="card__cue" aria-hidden="true" />}
              >
                {current && (
                  <span className="course-card__current">
                    <Pictogram
                      id={current.topic.icon}
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
