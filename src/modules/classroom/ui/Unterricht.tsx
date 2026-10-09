import { useMemo, useState, useSyncExternalStore } from "react";
import { Link, useFetcher } from "react-router";
import { useSite } from "./SiteContext";
import { Settings } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  Switch,
  buttonClassName,
} from "@chromatis/base/ui";
import {
  chapterPath,
  chaptersInOrder,
  sheetsFor,
  type Course,
} from "../../courses";
import { ChapterHeading } from "./ChapterHeading";
import { ClassroomStart } from "./ClassroomStart";
import { targetStore } from "../infrastructure/targetStore";
import {
  chapterStore,
  isUnlocked,
  tasksOf,
  type SheetsData,
} from "../../worksheets";
import type { SummaryRule, Worksheet } from "../../catalog";

// The row keeps access, solutions and active-target confirmation together.
// eslint-disable-next-line max-lines-per-function
function SheetRow({
  data,
  sheet,
  courseId,
  chapterId,
}: {
  data: SheetsData;
  sheet: Worksheet;
  courseId: string;
  chapterId: string;
}) {
  const store = chapterStore(chapterId);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const [open, setOpen] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const releaseFetcher = useFetcher();
  const target = targetStore(courseId);
  const active = useSyncExternalStore(
    target.subscribe,
    target.getSnapshot,
    target.getServerSnapshot,
  );
  const targetHere = active?.kind === "sheet" && active.id === sheet.id;
  const unlocked = isUnlocked(data, sheet, state);
  const solutions = sheet.sections
    .flatMap(tasksOf)
    .filter((task) =>
      task.items.some(
        (item) => item.type === "part" && item.part.markers.loesung,
      ),
    );
  const released =
    solutions.length > 0 &&
    solutions.every((task) => data.releasedSolutions.includes(task.id));
  return (
    <li className="teacher-controls-access-row">
      <div>
        <strong>
          {data.sheets.indexOf(sheet) + 1}) {sheet.title}
        </strong>{" "}
        <Badge status={unlocked ? "success" : "neutral"}>
          {unlocked ? "Freigeschaltet" : "Gesperrt"}
        </Badge>{" "}
        {released && <Badge status="success">Musterlösungen freigegeben</Badge>}
        {targetHere && (
          <Badge status="info">Schüler:innen werden hierher geschickt</Badge>
        )}
      </div>
      <div className="teacher-controls-access-actions">
        {!unlocked && (
          <Button size="sm" onClick={() => store.setUnlocked(sheet.id, true)}>
            Freischalten
          </Button>
        )}
        <Button
          role="ghost"
          size="sm"
          aria-label={`Einstellungen für ${sheet.title}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Settings className="icon icon--sm" />
        </Button>
      </div>
      {open && (
        <div className="teacher-controls-access-popover">
          <Switch
            label="Für die Klasse freigeschaltet"
            checked={unlocked}
            onChange={(event) => {
              if (!event.target.checked && targetHere) {
                setConfirmLock(true);
              } else {
                store.setUnlocked(sheet.id, event.target.checked);
              }
            }}
          />
          <Switch
            label="Musterlösungen freigegeben"
            checked={released}
            disabled={!solutions.length}
            onChange={(event) => {
              const data = new FormData();
              data.set("intent", "releaseSolutions");
              data.set("chapterId", chapterId);
              data.set("sheetId", sheet.id);
              data.set("released", String(event.target.checked));
              void releaseFetcher.submit(data, { method: "post" });
            }}
          />
          <Link to={`${chapterPath(courseId, chapterId)}/sheets/${sheet.id}`}>
            Arbeitsblatt öffnen
          </Link>
          {confirmLock && (
            <Alert status="warning" title="Arbeitsblatt sperren?">
              <p>Schüler:innen werden gerade hierher geschickt.</p>
              <div className="teacher-controls-actions">
                <Button
                  role="secondary"
                  size="sm"
                  onClick={() => setConfirmLock(false)}
                >
                  Abbrechen
                </Button>
                <Button
                  role="destructive"
                  size="sm"
                  onClick={() => {
                    store.setUnlocked(sheet.id, false);
                    target.set(null);
                    setConfirmLock(false);
                  }}
                >
                  Trotzdem sperren
                </Button>
              </div>
            </Alert>
          )}
        </div>
      )}
    </li>
  );
}

const RULES: Record<SummaryRule, string> = {
  kapitel: "Mit dem Kapitel",
  abschluss: "Nach Abschluss des Kapitels",
  manuell: "Nur manuell",
};

/** The chapter's Inhalt: locked until released, by hand or by the rule. */
function InhaltRow({
  course,
  chapterId,
}: {
  course: Course;
  chapterId: string;
}) {
  const site = useSite();
  const fetcher = useFetcher();
  const [settings, setSettings] = useState(false);
  const summary = site.catalog.summaries.find(
    (item) => item.chapterId === chapterId,
  );
  const released = site.releasedSummaries.includes(chapterId);
  const rule = site.summaryRules[chapterId] ?? "manuell";
  if (!summary) {
    return <p>Dieses Kapitel hat noch keinen Inhalt.</p>;
  }
  const send = (values: Record<string, string>) =>
    void fetcher.submit({ chapterId, ...values }, { method: "post" });
  return (
    <ul className="teacher-controls-access-list">
      <li className="teacher-controls-access-row">
        <div>
          <strong>{summary.title}</strong>{" "}
          <Badge status={released ? "success" : "neutral"}>
            {released ? "Freigeschaltet" : "Gesperrt"}
          </Badge>
          <small>Freigabe: {RULES[rule]}</small>
        </div>
        <div className="teacher-controls-access-actions">
          {!released && (
            <Button
              size="sm"
              onClick={() => send({ intent: "releaseSummary" })}
            >
              Freischalten
            </Button>
          )}
          <Button
            role="ghost"
            size="sm"
            aria-label="Einstellungen für den Inhalt"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <Settings className="icon icon--sm" />
          </Button>
        </div>
        {settings && (
          <div className="teacher-controls-access-popover">
            <Switch
              label="Für die Klasse freigeschaltet"
              checked={released}
              onChange={(event) =>
                send({
                  intent: event.target.checked
                    ? "releaseSummary"
                    : "lockSummary",
                })
              }
            />
            <fieldset>
              <legend>Freigabe</legend>
              {(Object.keys(RULES) as SummaryRule[]).map((option) => (
                <label key={option}>
                  <input
                    type="radio"
                    name="summary-rule"
                    checked={rule === option}
                    onChange={() =>
                      send({ intent: "summaryRule", rule: option })
                    }
                  />
                  {RULES[option]}
                </label>
              ))}
            </fieldset>
            <Link to={`${chapterPath(course.id, chapterId)}#inhalt`}>
              Inhalt öffnen
            </Link>
          </div>
        )}
      </li>
    </ul>
  );
}

/** Starting a presentation of the chapter: the ones the overview lists. */
function StartPresentation({
  course,
  chapterId,
}: {
  course: Course;
  chapterId: string;
}) {
  const { catalog } = useSite();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const presentations = catalog.presentations.filter((item) => {
    const set = catalog.foliensaetze.find(
      (candidate) => candidate.id === item.rootFoliensatzId,
    );
    return item.chapterId === chapterId && !!set?.inOverview;
  });
  const chosen =
    presentations.find((item) => item.id === selected) ?? presentations[0];
  if (!presentations.length) {
    return (
      <Alert status="info">
        Für dieses Kapitel ist kein Foliensatz in der Übersicht.
      </Alert>
    );
  }
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        Unterrichtsmodus starten
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        closeLabel="Schließen"
        title="Unterrichtsmodus starten"
      >
        <div className="teacher-controls-start-options">
          {presentations.map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="presentation"
                value={item.id}
                checked={chosen?.id === item.id}
                onChange={() => setSelected(item.id)}
              />
              {item.title}
            </label>
          ))}
        </div>
        <div className="teacher-controls-actions">
          <Button role="secondary" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          {chosen && (
            <Link
              className={buttonClassName({})}
              to={`${chapterPath(course.id, chapterId)}/lesson?presentation=${encodeURIComponent(chosen.id)}`}
            >
              Unterrichtsmodus starten
            </Link>
          )}
        </div>
      </Dialog>
    </>
  );
}

/** The class's current chapter: starting a presentation, releasing the Inhalt and the sheets. */
export function Unterricht({ course }: { course: Course }) {
  const site = useSite();
  const current = chaptersInOrder(course).find((chapter) => chapter.current);
  const data = useMemo(
    () => (current ? sheetsFor(site, course.id, current.id) : undefined),
    [site, course.id, current],
  );
  if (!current) {
    return <Alert status="info">Noch kein aktuelles Kapitel.</Alert>;
  }
  return (
    <div className="teacher-controls-stack">
      <div className="teacher-controls-chapter-intro">
        <ChapterHeading chapter={current} />
        <div className="teacher-controls-chapter-actions">
          <Link
            className={buttonClassName({ size: "sm" })}
            to={`/courses/${course.id}/course-structure`}
          >
            Kapitel wechseln
          </Link>
          <Link
            className={buttonClassName({ role: "secondary", size: "sm" })}
            to={`/courses/${course.id}/content`}
          >
            Inhalte ansehen
          </Link>
        </div>
      </div>
      <ClassroomStart courseId={course.id} />
      <section aria-labelledby="overview-teaching">
        <h2 id="overview-teaching" className="h2">
          Unterricht
        </h2>
        <StartPresentation course={course} chapterId={current.id} />
      </section>
      <section aria-labelledby="overview-summary">
        <h2 id="overview-summary" className="h2">
          Inhalt
        </h2>
        <InhaltRow course={course} chapterId={current.id} />
      </section>
      <section aria-labelledby="overview-sheets">
        <h2 id="overview-sheets" className="h2">
          Arbeitsblätter
        </h2>
        {data?.sheets.length ? (
          <ul className="teacher-controls-access-list">
            {data.sheets.map((sheet) => (
              <SheetRow
                key={sheet.id}
                data={data}
                sheet={sheet}
                courseId={course.id}
                chapterId={current.id}
              />
            ))}
          </ul>
        ) : (
          <p>Dieses Kapitel hat noch keine Arbeitsblätter.</p>
        )}
      </section>
    </div>
  );
}
