/* eslint-disable max-lines */
import { useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Alert, Badge, Button } from "@chromatis/base/ui";
import {
  chaptersInOrder,
  Linie,
  LinieStop,
  Pictogram,
  summariesToRelease,
  trackFor,
  type Course,
  type Topic,
} from "../../courses";
import { useSite } from "./SiteContext";
import { localReleases } from "../infrastructure/localReleases";
import { chapterStore, isSheetUnlocked } from "../../worksheets";
import { ChapterHeading } from "./ChapterHeading";
import TEXT from "./classroom.de.json";

function autoScroll(y: number) {
  if (y < 90) {
    window.scrollBy(0, -12);
  } else if (y > window.innerHeight - 90) {
    window.scrollBy(0, 12);
  }
}

function PlanAction({
  intent,
  id,
  label,
  children,
  role = "ghost",
  disabled = false,
}: {
  intent: string;
  id: string;
  label: string;
  children: ReactNode;
  role?: "ghost" | "destructive";
  disabled?: boolean;
}) {
  const fetcher = useFetcher();
  const [confirm, setConfirm] = useState(false);
  if (intent === "remove" && !confirm) {
    return (
      <Button
        role={role}
        size="sm"
        disabled={disabled}
        aria-label={label}
        onClick={() => setConfirm(true)}
      >
        {children}
      </Button>
    );
  }
  return (
    <fetcher.Form
      method="post"
      className="teacher-controls-plan-action"
      onSubmit={() => setConfirm(false)}
    >
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="id" value={id} />
      {confirm && <span>{label}?</span>}
      <Button
        type="submit"
        role={role}
        size="sm"
        disabled={disabled}
        aria-label={label}
      >
        {confirm ? "Entfernen" : children}
      </Button>
      {confirm && (
        <Button role="ghost" size="sm" onClick={() => setConfirm(false)}>
          Abbrechen
        </Button>
      )}
    </fetcher.Form>
  );
}

function AddChapter({ topic }: { topic: Topic }) {
  const [open, setOpen] = useState(false);
  const [template, setTemplate] = useState("exam-practice");
  const [title, setTitle] = useState(TEXT.teacher.templateExam);
  const [typed, setTyped] = useState(false);
  const fetcher = useFetcher();
  return open ? (
    <fetcher.Form
      method="post"
      className="teacher-controls-inline-form"
      onSubmit={() => setOpen(false)}
    >
      <input type="hidden" name="intent" value="add-chapter" />
      <input type="hidden" name="id" value={topic.id} />
      <label>
        Vorlage
        <select
          className="select__control"
          name="template"
          value={template}
          onChange={(event) => {
            setTemplate(event.target.value);
            if (!typed) {
              setTitle(
                event.target.value === "empty"
                  ? ""
                  : (event.target.options[event.target.selectedIndex]?.text ??
                      ""),
              );
            }
          }}
        >
          <option value="exam-practice">{TEXT.teacher.templateExam}</option>
          <option value="review">{TEXT.teacher.templateReview}</option>
          <option value="empty">{TEXT.teacher.templateEmpty}</option>
        </select>
      </label>
      <label>
        Titel des Kapitels
        <input
          className="input"
          name="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            setTyped(true);
          }}
          required
          autoFocus
        />
      </label>
      <Button type="submit" size="sm">
        {TEXT.teacher.insertChapter}
      </Button>
      <Button role="ghost" size="sm" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
    </fetcher.Form>
  ) : (
    <Button role="ghost" size="sm" onClick={() => setOpen(true)}>
      <Plus className="icon icon--sm" aria-hidden="true" />
      {TEXT.teacher.insertChapterIn.replace("{title}", topic.title)}
    </Button>
  );
}

function AddTopic({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  return open ? (
    <fetcher.Form
      method="post"
      className="teacher-controls-inline-form"
      onSubmit={() => setOpen(false)}
    >
      <input type="hidden" name="intent" value="add-topic" />
      <label>
        Titel des Themas
        <input className="input" name="title" required autoFocus />
      </label>
      <label>
        Position
        <select className="select__control" name="afterTopicId">
          <option value="">{TEXT.teacher.startOfPath}</option>
          {course.topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              Nach {topic.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Piktogramm
        <select className="select__control" name="icon">
          <option value="kurve">{TEXT.teacher.iconCurve}</option>
          <option value="baum">{TEXT.teacher.iconTree}</option>
          <option value="terme">{TEXT.teacher.iconTerms}</option>
          <option value="gerade">{TEXT.teacher.iconLine}</option>
          <option value="prototyp">{TEXT.teacher.iconPrototype}</option>
        </select>
      </label>
      <label>
        Erstes Kapitel
        <input className="input" name="firstChapter" required />
      </label>
      <Button type="submit" size="sm">
        Thema anlegen
      </Button>
      <Button role="ghost" size="sm" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
    </fetcher.Form>
  ) : (
    <Button role="secondary" onClick={() => setOpen(true)}>
      <Plus className="icon" aria-hidden="true" />
      Neues Thema anlegen
    </Button>
  );
}

function Rename({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  return open ? (
    <fetcher.Form
      method="post"
      className="teacher-controls-inline-form"
      onSubmit={() => setOpen(false)}
    >
      <input type="hidden" name="intent" value="rename" />
      <input type="hidden" name="id" value={id} />
      <label>
        Neuer Titel
        <input
          className="input"
          name="title"
          defaultValue={title}
          required
          autoFocus
        />
      </label>
      <Button type="submit" size="sm">
        Speichern
      </Button>
      <Button role="ghost" size="sm" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
    </fetcher.Form>
  ) : (
    <Button role="ghost" size="sm" onClick={() => setOpen(true)}>
      Umbenennen
    </Button>
  );
}

// The editable line keeps each topic and its chapters in one ordered list.
// Each line stop owns its insert and edit controls.
// eslint-disable-next-line max-lines-per-function
export function LernwegControl({ course }: { course: Course }) {
  const site = useSite();
  const chapters = chaptersInOrder(course);
  const currentChapter = chapters.find((chapter) => chapter.current);
  const [pending, setPending] = useState<string | null>(null);
  const fetcher = useFetcher();
  const [dragged, setDragged] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const rows = course.topics.flatMap((topic) => [
    { kind: "topic" as const, topic },
    ...topic.chapters.map((chapter) => ({
      kind: "chapter" as const,
      topic,
      chapter,
    })),
  ]);
  const hereIndex = rows.findIndex(
    (row) =>
      row.kind === "chapter" && row.chapter.id === course.currentChapterId,
  );
  const selected = chapters.find((chapter) => chapter.id === pending);
  const oldIndex = chapters.findIndex(
    (item) => item.id === course.currentChapterId,
  );
  const newIndex = selected
    ? chapters.findIndex((item) => item.id === selected.id)
    : oldIndex;
  const selectedSheets = selected
    ? (site.index.worksheets[selected.id] ?? [])
    : [];
  const summariesToOpen = selected
    ? summariesToRelease({
        order: chapters.map((item) => item.id),
        from: course.currentChapterId,
        to: selected.id,
        rule: (id) => site.summaryRules[id] ?? "manuell",
        closed: (id) =>
          site.index.summaryTitles[id] !== undefined &&
          !site.releasedSummaries.includes(id),
      })
        .map((id) => chapters.find((item) => item.id === id))
        .flatMap((item) => (item ? [item] : []))
    : [];
  const lockedSheets = selectedSheets.filter(
    (sheet) =>
      !isSheetUnlocked(
        selectedSheets[0]?.id,
        site.sessionSheets,
        sheet.id,
        chapterStore(selected?.id ?? "").getSnapshot(),
      ),
  ).length;
  return (
    <div className="teacher-controls-stack">
      {currentChapter && <ChapterHeading chapter={currentChapter} />}
      <Linie
        label={`Kursstruktur ${course.title}`}
        className="teacher-controls-linie"
      >
        {/* Each stop has its own drop and edit controls. */}
        {/* eslint-disable-next-line max-lines-per-function */}
        {rows.map((row, index) => {
          const track = trackFor(index, rows.length, hereIndex, {
            connectTop: false,
          });
          if (row.kind === "topic") {
            return (
              <LinieStop
                key={row.topic.id}
                kind="topic"
                status={index <= hereIndex ? "done" : "ahead"}
                {...track}
              >
                <div
                  className="teacher-controls-topic"
                  data-drop={
                    dropTarget === `${row.topic.id}:start` || undefined
                  }
                  onDragOver={(event) => {
                    if (dragged) {
                      event.preventDefault();
                      autoScroll(event.clientY);
                      setDropTarget(`${row.topic.id}:start`);
                    }
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragged) {
                      void fetcher.submit(
                        {
                          intent: "move",
                          id: dragged,
                          targetId: row.topic.id,
                          position: "start",
                        },
                        { method: "post" },
                      );
                    }
                    setDragged(null);
                    setDropTarget(null);
                  }}
                >
                  <Pictogram
                    icon={row.topic.icon}
                    fallbackLabel={row.topic.title}
                  />
                  <div>
                    <h2 className="h4">
                      {row.topic.number} {row.topic.title}
                    </h2>
                    {row.topic.id.startsWith("custom-topic-") && (
                      <Rename id={row.topic.id} title={row.topic.title} />
                    )}
                  </div>
                  {row.topic.id.startsWith("custom-topic-") && (
                    <PlanAction
                      intent="remove"
                      id={row.topic.id}
                      label={`${row.topic.title} entfernen`}
                      role="destructive"
                      disabled={row.topic.chapters.some(
                        (item) => item.id === course.currentChapterId,
                      )}
                    >
                      <Trash2 className="icon icon--sm" aria-hidden="true" />
                    </PlanAction>
                  )}
                </div>
                {!row.topic.chapters.length && (
                  <div
                    data-drop={
                      dropTarget === `${row.topic.id}:end` || undefined
                    }
                    onDragOver={(event) => {
                      if (dragged) {
                        event.preventDefault();
                        autoScroll(event.clientY);
                        setDropTarget(`${row.topic.id}:end`);
                      }
                    }}
                    onDragLeave={() => setDropTarget(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragged) {
                        void fetcher.submit(
                          {
                            intent: "move",
                            id: dragged,
                            targetId: row.topic.id,
                            position: "end",
                          },
                          { method: "post" },
                        );
                      }
                      setDragged(null);
                      setDropTarget(null);
                    }}
                  >
                    <AddChapter topic={row.topic} />
                  </div>
                )}
              </LinieStop>
            );
          }
          const current = row.chapter.id === course.currentChapterId;
          const siblingIndex = row.topic.chapters.findIndex(
            (item) => item.id === row.chapter.id,
          );
          return (
            <LinieStop
              key={row.chapter.id}
              kind="chapter"
              status={current ? "here" : index < hereIndex ? "done" : "ahead"}
              {...track}
            >
              <div
                className="teacher-controls-chapter"
                data-drop={dropTarget === row.chapter.id || undefined}
                onDragOver={(event) => {
                  if (dragged) {
                    event.preventDefault();
                    autoScroll(event.clientY);
                    setDropTarget(row.chapter.id);
                  }
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragged && dragged !== row.chapter.id) {
                    void fetcher.submit(
                      { intent: "move", id: dragged, targetId: row.chapter.id },
                      { method: "post" },
                    );
                  }
                  setDragged(null);
                  setDropTarget(null);
                }}
              >
                <label>
                  <input
                    type="radio"
                    name="current-chapter"
                    checked={
                      (pending ?? course.currentChapterId) === row.chapter.id
                    }
                    onChange={() => setPending(row.chapter.id)}
                  />
                  <span>
                    {row.chapter.number} {row.chapter.title}
                  </span>
                  {current && (
                    <Badge status="info">{TEXT.teacher.current}</Badge>
                  )}
                </label>
                <div className="teacher-controls-chapter__actions">
                  {row.chapter.id.startsWith("custom-chapter-") && (
                    <>
                      <button
                        type="button"
                        className="icon-btn teacher-controls-grip"
                        draggable
                        aria-label={`${row.chapter.title} verschieben. Mit Pfeil hoch und Pfeil runter verschieben.`}
                        onDragStart={() => setDragged(row.chapter.id)}
                        onDragEnd={() => {
                          setDragged(null);
                          setDropTarget(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp" && siblingIndex > 0) {
                            event.preventDefault();
                            void fetcher.submit(
                              { intent: "up", id: row.chapter.id },
                              { method: "post" },
                            );
                          }
                          if (
                            event.key === "ArrowDown" &&
                            siblingIndex < row.topic.chapters.length - 1
                          ) {
                            event.preventDefault();
                            void fetcher.submit(
                              { intent: "down", id: row.chapter.id },
                              { method: "post" },
                            );
                          }
                        }}
                      >
                        <GripVertical aria-hidden="true" />
                      </button>
                      <Rename id={row.chapter.id} title={row.chapter.title} />
                      <PlanAction
                        intent="remove"
                        id={row.chapter.id}
                        label={`${row.chapter.title} entfernen`}
                        role="destructive"
                        disabled={current}
                      >
                        <Trash2 className="icon icon--sm" aria-hidden="true" />
                      </PlanAction>
                    </>
                  )}
                </div>
              </div>
              {siblingIndex === row.topic.chapters.length - 1 && (
                <div
                  data-drop={dropTarget === `${row.topic.id}:end` || undefined}
                  onDragOver={(event) => {
                    if (dragged) {
                      event.preventDefault();
                      autoScroll(event.clientY);
                      setDropTarget(`${row.topic.id}:end`);
                    }
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragged) {
                      void fetcher.submit(
                        {
                          intent: "move",
                          id: dragged,
                          targetId: row.topic.id,
                          position: "end",
                        },
                        { method: "post" },
                      );
                    }
                    setDragged(null);
                    setDropTarget(null);
                  }}
                >
                  <AddChapter topic={row.topic} />
                </div>
              )}
            </LinieStop>
          );
        })}
      </Linie>
      <AddTopic course={course} />
      {selected && (
        <Alert
          status="info"
          title={TEXT.teacher.confirmCurrent
            .replace("{number}", selected.number)
            .replace("{title}", selected.title)}
          className="teacher-controls-confirm"
          actions={
            <div className="teacher-controls-actions">
              <Button role="secondary" onClick={() => setPending(null)}>
                Abbrechen
              </Button>
              <fetcher.Form
                method="post"
                onSubmit={() => {
                  if (site.localReleases) {
                    summariesToOpen.forEach((item) =>
                      localReleases.setSummary(item.id, true),
                    );
                  }
                  setPending(null);
                }}
              >
                <input type="hidden" name="intent" value="current" />
                <input type="hidden" name="id" value={selected.id} />
                <Button type="submit">{TEXT.teacher.setCurrent}</Button>
              </fetcher.Form>
            </div>
          }
        >
          <p>
            {TEXT.teacher.previousCurrent
              .replace("{number}", chapters[oldIndex]?.number ?? "")
              .replace("{title}", chapters[oldIndex]?.title ?? "")}
          </p>
          <p>
            {newIndex > oldIndex
              ? TEXT.teacher.willSeeThrough.replace("{number}", selected.number)
              : TEXT.teacher.laterPreview}
          </p>
          <p>
            {TEXT.teacher.lockedSheets.replace("{count}", String(lockedSheets))}
          </p>
          {summariesToOpen.map((item) => (
            <p key={item.id}>
              {TEXT.teacher.summaryWillRelease
                .replace("{number}", item.number)
                .replace("{title}", item.title)}
            </p>
          ))}
        </Alert>
      )}
    </div>
  );
}
