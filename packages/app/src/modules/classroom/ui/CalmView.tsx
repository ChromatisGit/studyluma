import { Link } from "react-router";
import {
  FileText,
  MessagesSquare,
  PencilLine,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { buttonClassName } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import { chapterPathById, coursePath } from "../../courses";
import type { Phase, Target } from "../domain/session";
import { useDeviceFocus, useLiveQuiz } from "./LiveQuizProvider";
import { useSite } from "./SiteContext";
import TEXT from "./classroom.de.json";
import "./calm.css";

const ICONS: Record<Phase, LucideIcon> = {
  unterricht: Presentation,
  aufgabe: PencilLine,
  arbeitsblatt: FileText,
  austausch: MessagesSquare,
};

/** The released Inhalte of the session's course, in course order. */
function useReleasedSummaries(courseId: string | null) {
  const site = useSite();
  const course = site.courses.find((item) => item.id === courseId);
  if (!course) {
    return [];
  }
  return course.topics
    .flatMap((topic) => topic.chapters)
    .filter(
      (chapter) =>
        site.releasedSummaries.includes(chapter.id) &&
        site.index.summaryTitles[chapter.id],
    )
    .map((chapter) => ({
      id: chapter.id,
      label: `${chapter.number} ${chapter.title}`,
      to: chapterPathById(course, chapter.id),
    }));
}

function Summaries({ courseId }: { courseId: string | null }) {
  const summaries = useReleasedSummaries(courseId);
  return (
    <nav className="calm__more" aria-label={TEXT.device.lookUp}>
      <h2 className="calm__more-title">{TEXT.device.lookUp}</h2>
      {summaries.length ? (
        <ul className="calm__links">
          {summaries.map((item) => (
            <li key={item.id}>
              <Link to={item.to}>{item.label}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="calm__hint">{TEXT.device.noSummaries}</p>
      )}
    </nav>
  );
}

/** What the phase opens: nothing, the Inhalte, or the worksheets as well. */
function Access({
  phase,
  sheetPath,
}: {
  phase: Phase;
  sheetPath: (target: Target, courseId: string | null) => string | null;
}) {
  const { sent } = useLiveQuiz();
  const courseId = sent?.courseId ?? null;
  if (phase === "aufgabe") {
    return <Summaries courseId={courseId} />;
  }
  if (phase !== "arbeitsblatt") {
    return null;
  }
  const sheet = sent?.target ? sheetPath(sent.target, courseId) : null;
  return (
    <>
      <div className="calm__actions">
        {sheet && (
          <Link className={buttonClassName({})} to={sheet}>
            {TEXT.device.toSheet}
          </Link>
        )}
        {courseId && (
          <Link
            className={buttonClassName({ role: "secondary" })}
            to={coursePath(courseId)}
          >
            {TEXT.device.toCourse}
          </Link>
        )}
      </div>
      <Summaries courseId={courseId} />
    </>
  );
}

/**
 * The student device during a lesson: a symbol and a word for what the
 * class does now, no mirror of the slides and no way into the course.
 * Only the green phases open something to look up.
 */
export function CalmView({
  sheetPath,
  coursesPath,
}: {
  sheetPath: (target: Target, courseId: string | null) => string | null;
  coursesPath: string;
}) {
  const { classroom } = useSite();
  const { ended } = useLiveQuiz();
  const { phase, name } = useDeviceFocus();
  if (classroom?.role !== "participant" || ended) {
    return (
      <main className="calm">
        <div className="calm__phase">
          <p className="calm__text">
            {ended ? TEXT.unitEnded : TEXT.device.noSession}
          </p>
          {ended && <p className="calm__hint">{TEXT.device.endedText}</p>}
          <Link className={buttonClassName({})} to={coursesPath}>
            {TEXT.join.toCourses}
          </Link>
        </div>
      </main>
    );
  }
  const Icon = phase && ICONS[phase];
  return (
    <main className="calm" data-phase={phase}>
      {/* Keyed by the phase: a change fades in anew. Until the first
          snapshot only the connection line shows, so a latecomer does not
          see Unterricht flash before the phase. */}
      {phase && Icon ? (
        <div className="calm__phase" key={phase}>
          <span className="calm__icon" aria-hidden="true">
            <Icon />
          </span>
          <h1 className="calm__text">{TEXT.device[phase]}</h1>
          <Access phase={phase} sheetPath={sheetPath} />
        </div>
      ) : (
        <div />
      )}
      <p className="calm__connection" role="status">
        <span
          className="calm__dot"
          data-connected={phase !== undefined || undefined}
          aria-hidden="true"
        />
        {phase !== undefined && name
          ? fill(TEXT.device.connected, { name })
          : TEXT.device.connecting}
      </p>
    </main>
  );
}
