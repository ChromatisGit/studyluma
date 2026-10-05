import { useState, type ReactNode } from "react";
import { useFetcher } from "react-router";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Alert, Badge, Button } from "@chromatis/base/ui";
import {
  chaptersInOrder,
  Linie,
  LinieStop,
  Pictogram,
  trackFor,
  type Course,
  type Topic,
} from "../../courses";

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
      className="steuerung-plan-action"
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
  const fetcher = useFetcher();
  return open ? (
    <fetcher.Form
      method="post"
      className="steuerung-inline-form"
      onSubmit={() => setOpen(false)}
    >
      <input type="hidden" name="intent" value="add-chapter" />
      <input type="hidden" name="id" value={topic.id} />
      <label>
        Titel des Kapitels
        <input className="input" name="title" required autoFocus />
      </label>
      <Button type="submit" size="sm">
        Kapitel einfügen
      </Button>
      <Button role="ghost" size="sm" onClick={() => setOpen(false)}>
        Abbrechen
      </Button>
    </fetcher.Form>
  ) : (
    <Button role="ghost" size="sm" onClick={() => setOpen(true)}>
      <Plus className="icon icon--sm" aria-hidden="true" />
      Kapitel einfügen in {topic.title}
    </Button>
  );
}

function AddTopic({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const fetcher = useFetcher();
  return open ? (
    <fetcher.Form
      method="post"
      className="steuerung-inline-form"
      onSubmit={() => setOpen(false)}
    >
      <input type="hidden" name="intent" value="add-topic" />
      <label>
        Titel des Themas
        <input className="input" name="title" required autoFocus />
      </label>
      <label>
        Schuljahr
        <select className="select__control" name="phaseId">
          {course.phases.map((phase) => (
            <option key={phase.id} value={phase.id}>
              {phase.label}
            </option>
          ))}
        </select>
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
      className="steuerung-inline-form"
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
// eslint-disable-next-line max-lines-per-function
export function LernwegControl({ course }: { course: Course }) {
  const chapters = chaptersInOrder(course);
  const [pending, setPending] = useState<string | null>(null);
  const fetcher = useFetcher();
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
  return (
    <div className="steuerung-stack">
      <p className="steuerung-intro">
        <strong>Hier legst du das aktuelle Kapitel fest.</strong> Spätere
        Kapitel sieht die Klasse als Vorschau. Du kannst Themen und Kapitel
        ergänzen und Kapitel im Thema verschieben.
      </p>
      <Linie
        label={`Lernweg ${course.title}`}
        badge={course.badge}
        badgeLabel={course.title}
        className="steuerung-linie"
      >
        {rows.map((row, index) => {
          const track = trackFor(index, rows.length, hereIndex);
          if (row.kind === "topic") {
            return (
              <LinieStop
                key={row.topic.id}
                kind="topic"
                status={index <= hereIndex ? "done" : "ahead"}
                {...track}
              >
                <div className="steuerung-topic">
                  <Pictogram
                    id={row.topic.icon}
                    fallbackLabel={row.topic.title}
                  />
                  <div>
                    <h2 className="h4">
                      {row.topic.number} {row.topic.title}
                    </h2>
                    <Rename id={row.topic.id} title={row.topic.title} />
                  </div>
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
                </div>
                {!row.topic.chapters.length && <AddChapter topic={row.topic} />}
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
              <div className="steuerung-chapter">
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
                  {current && <Badge status="info">Aktuell</Badge>}
                </label>
                <div className="steuerung-chapter__actions">
                  <Rename id={row.chapter.id} title={row.chapter.title} />
                  <PlanAction
                    intent="up"
                    id={row.chapter.id}
                    label={`${row.chapter.title} nach oben verschieben`}
                    disabled={siblingIndex === 0}
                  >
                    <ArrowUp className="icon icon--sm" aria-hidden="true" />
                  </PlanAction>
                  <PlanAction
                    intent="down"
                    id={row.chapter.id}
                    label={`${row.chapter.title} nach unten verschieben`}
                    disabled={siblingIndex === row.topic.chapters.length - 1}
                  >
                    <ArrowDown className="icon icon--sm" aria-hidden="true" />
                  </PlanAction>
                  <PlanAction
                    intent="remove"
                    id={row.chapter.id}
                    label={`${row.chapter.title} entfernen`}
                    role="destructive"
                    disabled={current}
                  >
                    <Trash2 className="icon icon--sm" aria-hidden="true" />
                  </PlanAction>
                </div>
              </div>
              {siblingIndex === row.topic.chapters.length - 1 && (
                <AddChapter topic={row.topic} />
              )}
            </LinieStop>
          );
        })}
      </Linie>
      <AddTopic course={course} />
      {selected && (
        <Alert
          status="info"
          title={`Neues aktuelles Kapitel: ${selected.number} ${selected.title}`}
          className="steuerung-confirm"
          actions={
            <div className="steuerung-actions">
              <Button role="secondary" onClick={() => setPending(null)}>
                Abbrechen
              </Button>
              <fetcher.Form method="post" onSubmit={() => setPending(null)}>
                <input type="hidden" name="intent" value="current" />
                <input type="hidden" name="id" value={selected.id} />
                <Button type="submit">Als aktuell festlegen</Button>
              </fetcher.Form>
            </div>
          }
        >
          Die Klasse sieht danach Inhalte bis einschließlich dieses Kapitels.
        </Alert>
      )}
    </div>
  );
}
