import { useEffect, useRef, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronDown } from "lucide-react";
import { Badge } from "@chromatis/base/ui";
import { chapterPath, chaptersInOrder, type Course } from "../../courses";
import { useSite } from "./SiteContext";
import { ChapterHeading } from "./ChapterHeading";
import { ResourceSection } from "./ResourceSection";
import TEXT from "./classroom.de.json";

function ResourceList({ items, empty }: { items: ReactNode[]; empty: string }) {
  return items.length ? (
    <ul className="teacher-controls-access-list">
      {items.map((item, index) => (
        <li className="teacher-controls-access-row" key={index}>
          {item}
        </li>
      ))}
    </ul>
  ) : (
    <p className="muted">{empty}</p>
  );
}

/** The authored resources of one chapter, in the teacher view's original order. */
// eslint-disable-next-line max-lines-per-function
export function Inhalte({
  course,
  openSlides,
}: {
  course: Course;
  /** Opens a deck on the stage, starting a unit if none runs; supplied by the lessons module, which this one does not import. */
  openSlides: (target: { path: string; presentationId: string }) => ReactNode;
}) {
  const site = useSite();
  const chapters = chaptersInOrder(course);
  const current = chapters.find((chapter) => chapter.current);
  const [params, setParams] = useSearchParams();
  const menu = useRef<HTMLDetailsElement>(null);
  const viewed =
    chapters.find((chapter) => chapter.id === params.get("kapitel")) ??
    current ??
    chapters[0];

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) {
        menu.current?.removeAttribute("open");
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  if (!viewed) {
    return <p>{TEXT.teacher.noChapters}</p>;
  }

  const choose = (chapterId: string) => {
    setParams({ kapitel: chapterId });
    if (menu.current) {
      menu.current.open = false;
    }
  };
  const catalog = site.catalog;
  const base = chapterPath(course.id, viewed.slug);
  const presentations = catalog.presentations.filter(
    (item) => item.chapterId === viewed.id,
  );
  const quizzes = catalog.quizzes.filter(
    (item) => item.chapterId === viewed.id,
  );
  const entry = catalog.chapters.find((item) => item.id === viewed.id);
  const sheets = (entry?.worksheetIds ?? []).flatMap((id) => {
    const sheet = catalog.worksheets.find((item) => item.id === id);
    return sheet ? [sheet] : [];
  });
  const challenges = catalog.challengePools.filter(
    (item) => item.chapterId === viewed.id,
  );
  const summary = catalog.summaries.find(
    (item) => item.chapterId === viewed.id,
  );
  const released = site.releasedSummaries.includes(viewed.id);

  return (
    <div className="teacher-controls-stack">
      <div className="teacher-controls-chapter-intro">
        <nav
          className="teacher-controls-chapter-nav"
          aria-label={TEXT.teacher.chapterContentLabel}
        >
          <details className="teacher-controls-chapter-menu" ref={menu}>
            <summary>
              {TEXT.teacher.chooseChapter}{" "}
              <ChevronDown className="icon icon--sm" aria-hidden="true" />
            </summary>
            <div className="teacher-controls-chapter-menu__list">
              {course.topics.map((topic) => (
                <div
                  className="teacher-controls-chapter-menu__group"
                  key={topic.id}
                >
                  <p>
                    {topic.number} {topic.title}
                  </p>
                  {topic.chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      type="button"
                      aria-current={
                        chapter.id === viewed.id ? "page" : undefined
                      }
                      onClick={() => choose(chapter.id)}
                    >
                      <span>
                        {chapter.number} {chapter.title}
                      </span>
                      {chapter.id === current?.id && (
                        <small>{TEXT.teacher.current}</small>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
          {!viewed.current && current && (
            <button
              type="button"
              className="teacher-controls-chapter-nav__return"
              onClick={() => choose(current.id)}
            >
              {TEXT.teacher.toCurrentChapter.replace(
                "{number}",
                current.number,
              )}
            </button>
          )}
        </nav>
        <ChapterHeading chapter={viewed} />
      </div>

      <ResourceSection
        id="content-presentations"
        title={TEXT.teacher.presentations}
      >
        <ResourceList
          empty={TEXT.teacher.noPresentations}
          items={presentations.map((presentation) => (
            <>
              <div>
                <strong>{presentation.title}</strong>
                <span className="teacher-controls-resource-meta">
                  {presentation.placements.length} {TEXT.teacher.slides}
                </span>
              </div>
              <div className="teacher-controls-access-actions">
                {openSlides({
                  path: `${base}/lesson?presentation=${encodeURIComponent(presentation.id)}`,
                  presentationId: presentation.id,
                })}
              </div>
            </>
          ))}
        />
      </ResourceSection>

      <ResourceSection id="content-quizzes" title={TEXT.teacher.quizzes}>
        <ResourceList
          empty={TEXT.teacher.noQuizzes}
          items={quizzes.map((quiz) => {
            const owner = presentations.find((presentation) =>
              presentation.placements.some(
                (placement) => placement.targetId === quiz.id,
              ),
            );
            const frame = owner?.placements.find(
              (placement) => placement.targetId === quiz.id,
            );
            return (
              <>
                <div>
                  <strong>{quiz.title}</strong>
                  <span className="teacher-controls-resource-meta">
                    {quiz.questions.length} {TEXT.teacher.questions}
                  </span>
                </div>
                {owner && frame && (
                  <div className="teacher-controls-access-actions">
                    {openSlides({
                      path: `${base}/lesson?presentation=${encodeURIComponent(owner.id)}&start=${encodeURIComponent(frame.id)}`,
                      presentationId: owner.id,
                    })}
                  </div>
                )}
              </>
            );
          })}
        />
      </ResourceSection>

      <ResourceSection id="content-summary" title={TEXT.teacher.summaryTitle}>
        <ResourceList
          empty={TEXT.teacher.noContent}
          items={
            summary
              ? [
                  <>
                    <div>
                      <strong>{summary.title}</strong>
                      <Badge status={released ? "success" : "neutral"}>
                        {released ? TEXT.teacher.released : TEXT.teacher.locked}
                      </Badge>
                    </div>
                    <div className="teacher-controls-access-actions">
                      <Link to={`${base}#inhalt`}>{TEXT.teacher.open}</Link>
                    </div>
                  </>,
                ]
              : []
          }
        />
      </ResourceSection>

      <ResourceSection id="content-sheets" title={TEXT.teacher.worksheets}>
        <ResourceList
          empty={TEXT.teacher.noWorksheets}
          items={sheets.map((sheet, index) => (
            <>
              <div>
                <strong>
                  {index + 1}) {sheet.title}
                </strong>
              </div>
              <div className="teacher-controls-access-actions">
                <Link to={`${base}/sheets/${encodeURIComponent(sheet.slug)}`}>
                  {TEXT.teacher.open}
                </Link>
              </div>
            </>
          ))}
        />
      </ResourceSection>

      <ResourceSection id="content-challenges" title={TEXT.teacher.challenges}>
        <ResourceList
          empty={TEXT.teacher.noChallenges}
          items={challenges.flatMap((pool) =>
            pool.challenges.map((challenge, index) => (
              <>
                <div>
                  <strong>{challenge.title ?? `Challenge ${index + 1}`}</strong>
                  {challenge.prerequisites?.length ? (
                    <span className="teacher-controls-resource-meta">
                      {TEXT.teacher.afterSheets.replace(
                        "{count}",
                        String(challenge.prerequisites.length),
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="teacher-controls-access-actions">
                  <Link to={`${base}/challenges`}>{TEXT.teacher.open}</Link>
                </div>
              </>
            )),
          )}
        />
      </ResourceSection>
    </div>
  );
}
