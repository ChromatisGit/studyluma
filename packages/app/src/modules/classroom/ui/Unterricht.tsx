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
  chapterPathById,
  chaptersInOrder,
  sheetsFor,
  type Course,
} from "../../courses";
import { ChapterHeading } from "./ChapterHeading";
import { ResourceSection } from "./ResourceSection";
import { ClassroomStart } from "./ClassroomStart";
import { targetStore } from "../infrastructure/targetStore";
import { localReleases } from "../infrastructure/localReleases";
import {
  chapterStore,
  isUnlocked,
  tasksOf,
  type SheetsData,
} from "../../worksheets";
import type { SummaryRule, Worksheet } from "../../catalog";
import TEXT from "./classroom.de.json";

// The row keeps access, solutions and active-target confirmation together.
// eslint-disable-next-line max-lines-per-function
function SheetRow({
  data,
  sheet,
  courseId,
  chapterId,
  chapterSlug,
}: {
  data: SheetsData;
  sheet: Worksheet;
  courseId: string;
  chapterId: string;
  chapterSlug: string;
}) {
  const site = useSite();
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
          {unlocked ? TEXT.teacher.released : TEXT.teacher.locked}
        </Badge>{" "}
        {released && (
          <Badge status="success">{TEXT.teacher.solutionsReleased}</Badge>
        )}
        {targetHere && <Badge status="info">{TEXT.teacher.targetHere}</Badge>}
      </div>
      <div className="teacher-controls-access-actions">
        {!unlocked && (
          <Button size="sm" onClick={() => store.setUnlocked(sheet.id, true)}>
            {TEXT.teacher.unlock}
          </Button>
        )}
        <Button
          role="ghost"
          size="sm"
          aria-label={TEXT.teacher.settingsFor.replace("{title}", sheet.title)}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Settings className="icon icon--sm" />
        </Button>
      </div>
      {open && (
        <div className="teacher-controls-access-popover">
          <Switch
            label={TEXT.teacher.classUnlocked}
            checked={unlocked}
            onChange={(event) => {
              if (!event.target.checked && targetHere) {
                setConfirmLock(true);
              } else {
                store.setUnlocked(sheet.id, event.target.checked);
              }
            }}
          />
          {confirmLock && (
            <Alert status="warning" title={TEXT.teacher.lockTitle}>
              <p>{TEXT.teacher.targetWarning}</p>
              <div className="teacher-controls-actions">
                <Button
                  role="secondary"
                  size="sm"
                  onClick={() => setConfirmLock(false)}
                >
                  {TEXT.teacher.cancel}
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
                  {TEXT.teacher.lockAnyway}
                </Button>
              </div>
            </Alert>
          )}
          <Switch
            label={TEXT.teacher.solutions}
            checked={released}
            disabled={!solutions.length}
            onChange={(event) => {
              if (site.localReleases) {
                localReleases.setSolutions(
                  solutions.map((task) => task.id),
                  event.target.checked,
                );
                return;
              }
              const data = new FormData();
              data.set("intent", "releaseSolutions");
              data.set("chapterId", chapterId);
              data.set("sheetId", sheet.id);
              data.set("released", String(event.target.checked));
              void releaseFetcher.submit(data, { method: "post" });
            }}
          />
          <Link
            to={`${chapterPath(courseId, chapterSlug)}/sheets/${encodeURIComponent(sheet.slug)}`}
          >
            {TEXT.teacher.openSheet}
          </Link>
        </div>
      )}
    </li>
  );
}

const RULES: Record<SummaryRule, string> = TEXT.teacher.rules;

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
    return <p>{TEXT.teacher.noSummary}</p>;
  }
  const send = (values: Record<string, string>) => {
    if (site.localReleases) {
      if (
        values.intent === "releaseSummary" ||
        values.intent === "lockSummary"
      ) {
        localReleases.setSummary(chapterId, values.intent === "releaseSummary");
      } else if (values.intent === "summaryRule") {
        localReleases.setRule(chapterId, values.rule as SummaryRule);
      }
      return;
    }
    void fetcher.submit({ chapterId, ...values }, { method: "post" });
  };
  return (
    <ul className="teacher-controls-access-list">
      <li className="teacher-controls-access-row">
        <div>
          <strong>{summary.title}</strong>{" "}
          <Badge status={released ? "success" : "neutral"}>
            {released ? TEXT.teacher.released : TEXT.teacher.locked}
          </Badge>
          <small>
            {TEXT.teacher.releasePrefix}
            {RULES[rule]}
          </small>
        </div>
        <div className="teacher-controls-access-actions">
          {!released && (
            <Button
              size="sm"
              onClick={() => send({ intent: "releaseSummary" })}
            >
              {TEXT.teacher.unlock}
            </Button>
          )}
          <Button
            role="ghost"
            size="sm"
            aria-label={TEXT.teacher.contentSettings}
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            <Settings className="icon icon--sm" />
          </Button>
        </div>
        {settings && (
          <div className="teacher-controls-access-popover">
            <Switch
              label={TEXT.teacher.classUnlocked}
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
              <legend>{TEXT.teacher.release}</legend>
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
            <Link to={`${chapterPathById(course, chapterId)}#inhalt`}>
              {TEXT.teacher.openContent}
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
    return <Alert status="info">{TEXT.teacher.noPresentation}</Alert>;
  }
  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        {TEXT.teacher.startLesson}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        closeLabel={TEXT.teacher.close}
        title={TEXT.teacher.startLesson}
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
            {TEXT.teacher.cancel}
          </Button>
          {chosen && (
            <Link
              className={buttonClassName({})}
              to={`${chapterPathById(course, chapterId)}/lesson?presentation=${encodeURIComponent(chosen.id)}`}
            >
              {TEXT.teacher.startLesson}
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
    return <Alert status="info">{TEXT.teacher.noCurrentChapter}</Alert>;
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
            {TEXT.teacher.changeChapter}
          </Link>
          <Link
            className={buttonClassName({ role: "secondary", size: "sm" })}
            to={`/courses/${course.id}/content`}
          >
            {TEXT.teacher.viewContent}
          </Link>
        </div>
      </div>
      {site.classroomEnabled && <ClassroomStart courseId={course.id} />}
      <ResourceSection
        id="overview-teaching"
        title={TEXT.teacher.teachingTitle}
      >
        <StartPresentation course={course} chapterId={current.id} />
      </ResourceSection>
      <ResourceSection id="overview-summary" title={TEXT.teacher.summaryTitle}>
        <InhaltRow course={course} chapterId={current.id} />
      </ResourceSection>
      <ResourceSection id="overview-sheets" title={TEXT.teacher.worksheets}>
        {data?.sheets.length ? (
          <ul className="teacher-controls-access-list">
            {data.sheets.map((sheet) => (
              <SheetRow
                key={sheet.id}
                data={data}
                sheet={sheet}
                courseId={course.id}
                chapterId={current.id}
                chapterSlug={current.slug}
              />
            ))}
          </ul>
        ) : (
          <p>{TEXT.teacher.noSheets}</p>
        )}
      </ResourceSection>
    </div>
  );
}
