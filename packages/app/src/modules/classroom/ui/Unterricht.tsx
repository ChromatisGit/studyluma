import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Link, useFetcher } from "react-router";
import { useSite } from "./SiteContext";
import { Settings } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
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
import { ChapterQuizzes } from "./ChapterQuizzes";
import { localReleases } from "../infrastructure/localReleases";
import { useSentTarget, useSheetAccess } from "../application/useSheetAccess";
import {
  chapterStore,
  isUnlocked,
  tasksOf,
  type SheetsData,
} from "../../worksheets";
import { useCatalog, type SummaryRule, type Worksheet } from "../../catalog";
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
  const { active, send } = useSentTarget(courseId);
  const setUnlocked = useSheetAccess(courseId, chapterId);
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
          <Button size="sm" onClick={() => setUnlocked(sheet.id, true)}>
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
                setUnlocked(sheet.id, event.target.checked);
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
                    setUnlocked(sheet.id, false);
                    send(null);
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

/** The popover of an Inhalt row: release switch, opening rule and a link to the text. */
function InhaltSettings({
  course,
  chapterId,
  released,
  rule,
  send,
}: {
  course: Course;
  chapterId: string;
  released: boolean;
  rule: SummaryRule;
  send: (values: Record<string, string>) => void;
}) {
  return (
    <div className="teacher-controls-access-popover">
      <Switch
        label={TEXT.teacher.classUnlocked}
        checked={released}
        onChange={(event) =>
          send({
            intent: event.target.checked ? "releaseSummary" : "lockSummary",
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
              onChange={() => send({ intent: "summaryRule", rule: option })}
            />
            {RULES[option]}
          </label>
        ))}
      </fieldset>
      <Link to={`${chapterPathById(course, chapterId)}#inhalt`}>
        {TEXT.teacher.openContent}
      </Link>
    </div>
  );
}

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
  const summaryTitle = site.index.summaryTitles[chapterId];
  const released = site.releasedSummaries.includes(chapterId);
  const rule = site.summaryRules[chapterId] ?? "manuell";
  if (summaryTitle === undefined) {
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
          <strong>{summaryTitle}</strong>{" "}
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
          <InhaltSettings
            course={course}
            chapterId={chapterId}
            released={released}
            rule={rule}
            send={send}
          />
        )}
      </li>
    </ul>
  );
}

export type UnterrichtProps = {
  course: Course;
  /** Starting or resuming the unit; supplied by the lessons module, which this one does not import. */
  start: ReactNode;
};

/** The class's current chapter: starting a unit, releasing the Inhalt and the sheets. */
export function Unterricht({ course, start }: UnterrichtProps) {
  const site = useSite();
  const catalog = useCatalog();
  const current = chaptersInOrder(course).find((chapter) => chapter.current);
  const data = useMemo(
    () =>
      current
        ? sheetsFor({ ...site, catalog }, course.id, current.id)
        : undefined,
    [site, catalog, course.id, current],
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
      <ResourceSection
        id="overview-teaching"
        title={TEXT.teacher.teachingTitle}
      >
        {start}
      </ResourceSection>
      <ResourceSection id="overview-summary" title={TEXT.teacher.summaryTitle}>
        <InhaltRow course={course} chapterId={current.id} />
      </ResourceSection>
      {site.classroomEnabled && (
        <ResourceSection id="overview-quizzes" title={TEXT.quizzes.title}>
          <ChapterQuizzes courseId={course.id} chapterId={current.id} />
        </ResourceSection>
      )}
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
