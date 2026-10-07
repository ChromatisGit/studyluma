import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router";
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
  getSummary,
  type Course,
} from "../../courses";
import { ChapterHeading } from "./ChapterHeading";
import {
  flowStore,
  summaryStore,
  targetStore,
  type SummaryRule,
} from "../../teaching";
import {
  chapterStore,
  getWorksheetChapter,
  isReleased,
  isUnlocked,
  type Sheet,
} from "../../worksheets";

const rules: Record<SummaryRule, string> = {
  kapitel: "Mit dem Kapitel",
  abschluss: "Nach Abschluss des Kapitels",
  manuell: "Nur manuell",
};

// The row keeps access, solutions and active-target confirmation together.
// eslint-disable-next-line max-lines-per-function
function SheetRow({
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
  const [open, setOpen] = useState(false);
  const [confirmLock, setConfirmLock] = useState(false);
  const target = targetStore(courseId);
  const active = useSyncExternalStore(
    target.subscribe,
    target.getSnapshot,
    target.getServerSnapshot,
  );
  const targetHere = active?.kind === "sheet" && active.id === sheet.id;
  const unlocked = isUnlocked(sheet, state);
  const solutions = sheet.sections
    .flatMap((section) => section.aufgaben)
    .filter((task) => task.solution);
  const released =
    solutions.length > 0 && solutions.every((task) => isReleased(task, state));
  return (
    <li className="steuerung-access-row">
      <div>
        <strong>
          {sheet.number}) {sheet.title}
        </strong>{" "}
        <Badge status={unlocked ? "success" : "neutral"}>
          {unlocked ? "Freigeschaltet" : "Gesperrt"}
        </Badge>{" "}
        {released && <Badge status="success">Musterlösungen freigegeben</Badge>}
        {targetHere && (
          <Badge status="info">Schüler:innen werden hierher geschickt</Badge>
        )}
      </div>
      <div className="steuerung-access-actions">
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
        <div className="steuerung-access-popover">
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
            onChange={(event) =>
              store.setReleased(
                solutions.map((task) => task.id),
                event.target.checked,
              )
            }
          />
          <Link to={`${chapterPath(courseId, chapterId)}/sheets/${sheet.id}`}>
            Arbeitsblatt öffnen
          </Link>
          {confirmLock && (
            <Alert status="warning" title="Arbeitsblatt sperren?">
              <p>Schüler:innen werden gerade hierher geschickt.</p>
              <div className="steuerung-actions">
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

/** Overview of the class's current chapter and its access decisions. */
// Overview keeps the four class access blocks together.
// eslint-disable-next-line max-lines-per-function
export function Unterricht({ course }: { course: Course }) {
  const current = chaptersInOrder(course).find((chapter) => chapter.current);
  const [startOpen, setStartOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [settings, setSettings] = useState(false);
  const flow = flowStore(current?.id ?? "");
  const flows = useSyncExternalStore(
    flow.subscribe,
    flow.getSnapshot,
    flow.getServerSnapshot,
  );
  const summary = summaryStore(current?.id ?? "");
  const access = useSyncExternalStore(
    summary.subscribe,
    summary.getSnapshot,
    summary.getServerSnapshot,
  );
  if (!current) {
    return <Alert status="info">Noch kein aktuelles Kapitel.</Alert>;
  }
  const worksheets = getWorksheetChapter(current.id, "teacher");
  const summaryText = getSummary(current.id);
  const selectedFlow = flows.find((item) => item.id === selected) ?? flows[0];
  return (
    <div className="steuerung-stack">
      <div className="steuerung-chapter-intro">
        <ChapterHeading chapter={current} />
        <div className="steuerung-chapter-actions">
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
      <section aria-labelledby="overview-teaching">
        <h2 id="overview-teaching" className="h2">
          Unterricht
        </h2>
        {flows.length ? (
          <Button
            size="lg"
            onClick={() => {
              setSelected(flows[0]?.id ?? "");
              setStartOpen(true);
            }}
          >
            Unterrichtsmodus starten
          </Button>
        ) : (
          <Alert status="info">
            Der Unterrichtsmodus lässt sich gerade nicht starten.{" "}
            <Link to={`/courses/${course.id}/content`}>
              Unterrichtsverlauf unter „Inhalte“ erstellen
            </Link>
          </Alert>
        )}
      </section>
      <section aria-labelledby="overview-summary">
        <h2 id="overview-summary" className="h2">
          Zusammenfassung
        </h2>
        {summaryText ? (
          <ul className="steuerung-access-list">
            <li className="steuerung-access-row">
              <div>
                <strong>Zusammenfassung</strong>{" "}
                <Badge status={access.unlocked ? "success" : "neutral"}>
                  {access.unlocked ? "Freigeschaltet" : "Gesperrt"}
                </Badge>
                <small>Freigabe: {rules[access.rule]}</small>
              </div>
              <div className="steuerung-access-actions">
                {!access.unlocked && (
                  <Button
                    size="sm"
                    onClick={() => summary.set({ unlocked: true })}
                  >
                    Freischalten
                  </Button>
                )}
                <Button
                  role="ghost"
                  size="sm"
                  aria-label="Einstellungen für die Zusammenfassung"
                  aria-expanded={settings}
                  onClick={() => setSettings(!settings)}
                >
                  <Settings className="icon icon--sm" />
                </Button>
              </div>
              {settings && (
                <div className="steuerung-access-popover">
                  <Switch
                    label="Für die Klasse freigeschaltet"
                    checked={access.unlocked}
                    onChange={(event) =>
                      summary.set({ unlocked: event.target.checked })
                    }
                  />
                  <fieldset>
                    <legend>Freigabe</legend>
                    {(Object.keys(rules) as SummaryRule[]).map((rule) => (
                      <label key={rule}>
                        <input
                          type="radio"
                          name="summary-rule"
                          checked={access.rule === rule}
                          onChange={() =>
                            summary.set({
                              rule,
                              unlocked:
                                rule === "kapitel" ? true : access.unlocked,
                            })
                          }
                        />
                        {rules[rule]}
                      </label>
                    ))}
                  </fieldset>
                  <Link
                    to={`${chapterPath(course.id, current.id)}#zusammenfassung`}
                  >
                    Zusammenfassung öffnen
                  </Link>
                </div>
              )}
            </li>
          </ul>
        ) : (
          <p>Dieses Kapitel hat noch keine Zusammenfassung.</p>
        )}
      </section>
      <section aria-labelledby="overview-sheets">
        <h2 id="overview-sheets" className="h2">
          Arbeitsblätter
        </h2>
        {worksheets?.sheets.length ? (
          <ul className="steuerung-access-list">
            {worksheets.sheets.map((sheet) => (
              <SheetRow
                key={sheet.id}
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
      <Dialog
        open={startOpen}
        onOpenChange={setStartOpen}
        closeLabel="Schließen"
        title="Unterrichtsmodus starten"
      >
        <div className="steuerung-start-options">
          {flows.map((item) => (
            <label key={item.id}>
              <input
                type="radio"
                name="flow"
                value={item.id}
                checked={selectedFlow?.id === item.id}
                onChange={() => setSelected(item.id)}
              />
              {item.name}
            </label>
          ))}
        </div>
        <div className="steuerung-actions">
          <Button role="secondary" onClick={() => setStartOpen(false)}>
            Abbrechen
          </Button>
          {selectedFlow && (
            <Link
              className={buttonClassName({})}
              to={`${chapterPath(course.id, current.id)}/lesson?flow=${encodeURIComponent(JSON.stringify(selectedFlow))}`}
            >
              Unterrichtsmodus starten
            </Link>
          )}
        </div>
      </Dialog>
    </div>
  );
}
