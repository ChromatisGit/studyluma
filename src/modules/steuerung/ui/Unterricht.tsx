import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Play } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Switch,
  buttonClassName,
} from "@chromatis/base/ui";
import {
  chapterPath,
  chaptersInOrder,
  Pictogram,
  type Course,
} from "../../courses";
import { getLesson } from "../../lessons";
import {
  chapterStore,
  getWorksheetChapter,
  isReleased,
  isUnlocked,
  sampleClassAmpel,
  type ClassAmpel,
  type Sheet,
} from "../../worksheets";

function lessonParts(chapterId: string) {
  const lesson = getLesson(chapterId);
  if (!lesson) {
    return [];
  }
  return lesson.lessons.map((part) => ({
    ...part,
    frames: lesson.frames.filter((frame) => frame.lesson === part.number),
  }));
}

function ClassAmpelBar({ totals }: { totals: ClassAmpel }) {
  const levels = ["green", "yellow", "red"] as const;
  const colors = { green: "Grün", yellow: "Gelb", red: "Rot" };
  return (
    <div className="steuerung-ampel">
      <div
        className="steuerung-ampel__bar"
        role="img"
        aria-label={levels
          .map((level) => `${colors[level]}: ${totals.levels[level]}`)
          .join(", ")}
      >
        {levels.map((level) =>
          totals.levels[level] ? (
            <span
              key={level}
              data-level={level}
              style={{ flex: totals.levels[level] }}
            >
              {totals.levels[level]}
            </span>
          ) : null,
        )}
      </div>
      <small>
        {totals.answered} von {totals.total} Antworten · Beispieldaten
      </small>
    </div>
  );
}

// The worksheet row keeps its controls and confirmation together.
// eslint-disable-next-line max-lines-per-function
function SheetControl({
  sheet,
  courseId,
  chapterId,
}: {
  sheet: Sheet;
  courseId: string;
  chapterId: string;
}) {
  const store = chapterStore(chapterId);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [expanded, setExpanded] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const unlocked = isUnlocked(sheet, state);
  const solutions = sheet.sections
    .flatMap((section) => section.aufgaben)
    .filter((aufgabe) => aufgabe.solution);
  const released =
    solutions.length > 0 &&
    solutions.every((aufgabe) => isReleased(aufgabe, state));
  const totals = sampleClassAmpel(sheet.id);
  return (
    <li className="steuerung-sheet" data-hidden={!unlocked || undefined}>
      <div className="steuerung-sheet__head">
        <div className="steuerung-sheet__title">
          {unlocked ? (
            <Link to={`${chapterPath(courseId, chapterId)}/sheets/${sheet.id}`}>
              {sheet.number}) {sheet.title}
            </Link>
          ) : (
            <span>
              {sheet.number}) {sheet.title}
            </span>
          )}
          {!unlocked && <Badge status="neutral">Verborgen</Badge>}
          {released && <Badge status="success">Lösungen freigegeben</Badge>}
        </div>
        <span className="steuerung-sheet__activity">Keine Live-Daten</span>
        <ClassAmpelBar totals={totals} />
        <Button
          role="ghost"
          size="sm"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          Details
        </Button>
      </div>
      {expanded && (
        <div className="steuerung-sheet__details">
          <div className="steuerung-sheet__controls">
            <Switch
              label="Für die Klasse sichtbar"
              checked={unlocked}
              onChange={(event) => {
                if (!event.target.checked) {
                  setConfirmHide(true);
                } else {
                  store.setUnlocked(sheet.id, true);
                }
              }}
            />
            <Switch
              label="Musterlösungen freigegeben"
              checked={released}
              disabled={!solutions.length}
              onChange={(event) =>
                store.setReleased(
                  solutions.map((aufgabe) => aufgabe.id),
                  event.target.checked,
                )
              }
            />
            {confirmHide && (
              <Alert status="warning" title="Arbeitsblatt verbergen?">
                <p>
                  Die Klasse kann es danach nicht mehr öffnen. Gespeicherte
                  Antworten bleiben erhalten.
                </p>
                <div className="steuerung-actions">
                  <Button
                    role="secondary"
                    size="sm"
                    onClick={() => setConfirmHide(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      store.setUnlocked(sheet.id, false);
                      setConfirmHide(false);
                    }}
                  >
                    Verbergen
                  </Button>
                </div>
              </Alert>
            )}
          </div>
          <div>
            <h3 className="h4">Ampel</h3>
            <ClassAmpelBar totals={totals} />
            <p className="muted">
              Anonyme Beispieldaten, bis die Klassenantworten zentral gezählt
              werden.
            </p>
          </div>
        </div>
      )}
    </li>
  );
}

function ChallengesControl({
  chapterId,
  courseId,
  count,
}: {
  chapterId: string;
  courseId: string;
  count: number;
}) {
  const store = chapterStore(chapterId);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const chapter = getWorksheetChapter(chapterId, "teacher");
  const solutions =
    chapter?.challenges
      .filter((item) => item.solution)
      .map((item) => item.id) ?? [];
  const released =
    solutions.length > 0 &&
    (chapter?.challenges
      .filter((item) => item.solution)
      .every((item) => isReleased(item, state)) ??
      false);
  return (
    <li className="steuerung-sheet">
      <div className="steuerung-sheet__head">
        <div className="steuerung-sheet__title">
          <Link to={`${chapterPath(courseId, chapterId)}/challenges`}>
            Challenges
          </Link>
          <small>{count} Aufgaben zum Kapitel</small>
        </div>
        <span className="steuerung-sheet__activity">Keine Live-Daten</span>
        <span className="muted">Keine Ampel</span>
        <div className="steuerung-sheet__challenge-controls">
          <Switch
            label="Lösungen"
            checked={!!released}
            disabled={!solutions.length}
            onChange={(event) =>
              store.setReleased(solutions, event.target.checked)
            }
          />
        </div>
      </div>
    </li>
  );
}

// The tab composes the selected chapter, lessons, and worksheet sections.
// eslint-disable-next-line max-lines-per-function
export function Unterricht({ course }: { course: Course }) {
  const chapters = chaptersInOrder(course);
  const [viewId, setViewId] = useState(
    course.currentChapterId ?? chapters[0]?.id ?? "",
  );
  const viewed =
    chapters.find((chapter) => chapter.id === viewId) ?? chapters[0];
  if (!viewed) {
    return <EmptyState title="Noch keine Kapitel" />;
  }
  const worksheets = getWorksheetChapter(viewed.id, "teacher");
  const lessons = lessonParts(viewed.id);
  return (
    <div className="steuerung-stack">
      <section aria-label="Kapitel">
        <Card surface="accent" className="steuerung-board">
          <CardBody>
            <Pictogram
              id={viewed.topic.icon}
              fallbackLabel={viewed.topic.title}
            />
            <div>
              <strong>
                {viewed.current ? "Aktuelles Kapitel" : "Du siehst gerade"}
              </strong>
              <Link to={chapterPath(course.id, viewed.id)}>
                {viewed.number} {viewed.title}
              </Link>
              <span>{viewed.topic.title}</span>
            </div>
          </CardBody>
        </Card>
        {!viewed.current && (
          <Alert status="info" className="steuerung-viewing">
            Für die Klasse ist{" "}
            {chapters.find((chapter) => chapter.current)?.number}{" "}
            {chapters.find((chapter) => chapter.current)?.title} aktuell.
            Änderungen hier gelten sofort.
          </Alert>
        )}
        <label className="steuerung-picker">
          <span>Anderes Kapitel ansehen</span>
          <select
            className="select__control"
            value={viewed.id}
            onChange={(event) => setViewId(event.target.value)}
          >
            {course.topics.map((topic) => (
              <optgroup key={topic.id} label={`${topic.number} ${topic.title}`}>
                {topic.chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.number} {chapter.title}
                    {chapter.id === course.currentChapterId ? " (aktuell)" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>
      <section aria-labelledby="steuerung-lessons">
        <h2 id="steuerung-lessons" className="h2">
          Unterrichtsfolien
        </h2>
        <p className="muted">
          Starten öffnet die Folien mit Projektorsteuerung.
        </p>
        {lessons.length ? (
          <ul className="steuerung-lessons">
            {lessons.map((part) => (
              <li key={part.number} className="steuerung-lesson">
                <span className="steuerung-lesson__preview" aria-hidden="true">
                  <Play />
                </span>
                <div>
                  <span>Stunde {part.number}</span>
                  <strong>{part.title}</strong>
                  <small>{part.frames.length} Folien</small>
                </div>
                <Link
                  className={buttonClassName({ size: "sm" })}
                  to={`${chapterPath(course.id, viewed.id)}/lesson?start=${encodeURIComponent(part.frames[0]?.id ?? "")}`}
                >
                  <Play className="icon icon--sm" aria-hidden="true" />
                  Starten
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Keine Folien für dieses Kapitel"
            description="Sobald Folien vorbereitet sind, startest du sie hier."
          />
        )}
      </section>
      <section aria-labelledby="steuerung-sheets">
        <h2 id="steuerung-sheets" className="h2">
          Arbeitsblätter
        </h2>
        <p className="muted">
          Sichtbarkeit und Musterlösungen gelten sofort. Live-Aktivität ist
          derzeit nicht verfügbar.
        </p>
        {worksheets &&
        (worksheets.sheets.length || worksheets.challenges.length) ? (
          <ul className="steuerung-sheets">
            <li className="steuerung-sheets__labels" aria-hidden="true">
              <span>Arbeitsblatt</span>
              <span>Gerade dabei</span>
              <span>Ampel</span>
              <span></span>
            </li>
            {worksheets.sheets.map((sheet) => (
              <SheetControl
                key={sheet.id}
                sheet={sheet}
                courseId={course.id}
                chapterId={viewed.id}
              />
            ))}
            {!!worksheets.challenges.length && (
              <ChallengesControl
                chapterId={viewed.id}
                courseId={course.id}
                count={worksheets.challenges.length}
              />
            )}
          </ul>
        ) : (
          <EmptyState
            title="Noch keine Arbeitsblätter"
            description="Dieses Kapitel hat noch keine Arbeitsblätter."
          />
        )}
      </section>
    </div>
  );
}
