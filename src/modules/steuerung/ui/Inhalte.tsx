/* eslint-disable max-lines */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Link, useSearchParams } from "react-router";
import { ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  buttonClassName,
} from "@chromatis/base/ui";
import {
  chapterPath,
  chaptersInOrder,
  getSummary,
  type Course,
} from "../../courses";
import { ChapterHeading } from "./ChapterHeading";
import { getLesson } from "../../lessons";
import {
  flowStore,
  type FlowStep,
  type StepType,
  type Unterrichtsverlauf,
} from "../../teaching";
import { getWorksheetChapter } from "../../worksheets";

const typeNames: Record<StepType, string> = {
  frame: "Lesson Frame",
  quiz: "Quiz",
  sheet: "Arbeitsblatt",
  summary: "Zusammenfassung freigeben",
};
const drafts = new Map<string, Unterrichtsverlauf>();
const editorSessions = new Map<
  string,
  { chapterId: string; editing: Unterrichtsverlauf | "new" | null }
>();

function resources(chapterId: string, type: StepType) {
  const lesson = getLesson(chapterId);
  const worksheets = getWorksheetChapter(chapterId, "teacher");
  if (type === "frame") {
    return (
      lesson?.lessons.map((part) => ({
        id: String(part.number),
        title: part.title,
      })) ?? []
    );
  }
  if (type === "quiz") {
    return (
      lesson?.frames.flatMap((frame) =>
        frame.blocks?.some((block) => block.type === "quiz")
          ? [{ id: frame.id, title: frame.title }]
          : [],
      ) ?? []
    );
  }
  if (type === "sheet") {
    return (
      worksheets?.sheets.map((sheet) => ({
        id: sheet.id,
        title: `${sheet.number}) ${sheet.title}`,
      })) ?? []
    );
  }
  return getSummary(chapterId)
    ? [{ id: "summary", title: "Zusammenfassung" }]
    : [];
}

function stepTitle(chapterId: string, step: FlowStep) {
  return (
    resources(chapterId, step.type).find((item) => item.id === step.ref)
      ?.title ?? `${typeNames[step.type]} fehlt`
  );
}

// The draft editor owns validation and step ordering until save.
// eslint-disable-next-line max-lines-per-function
function Editor({
  chapterId,
  initial,
  onCancel,
  onSave,
}: {
  chapterId: string;
  initial: Unterrichtsverlauf | null;
  onCancel: () => void;
  onSave: (flow: Unterrichtsverlauf) => void;
}) {
  const draftKey = initial?.id ?? `new:${chapterId}`;
  const [draft, setDraft] = useState<Unterrichtsverlauf>(
    () =>
      drafts.get(draftKey) ??
      (initial
        ? structuredClone(initial)
        : { id: crypto.randomUUID(), chapterId, name: "", steps: [] }),
  );
  useEffect(() => {
    drafts.set(draftKey, draft);
  }, [draftKey, draft]);
  const cancel = () => {
    drafts.delete(draftKey);
    onCancel();
  };
  const [adding, setAdding] = useState(!initial);
  const [type, setType] = useState<StepType>("frame");
  const [ref, setRef] = useState("");
  const [error, setError] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const options = resources(chapterId, type);
  const selected = options.some((item) => item.id === ref)
    ? ref
    : (options[0]?.id ?? "");
  const move = (fromId: string, toId: string) => {
    const steps = [...draft.steps];
    const from = steps.findIndex((item) => item.id === fromId);
    const to = steps.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0 || from === to) {
      return;
    }
    const [item] = steps.splice(from, 1);
    if (!item) {
      return;
    }
    steps.splice(to, 0, item);
    setDraft({ ...draft, steps });
  };
  const add = () => {
    if (
      !selected ||
      (type === "summary" &&
        draft.steps.some((item) => item.type === "summary"))
    ) {
      return;
    }
    setDraft({
      ...draft,
      steps: [
        ...draft.steps,
        {
          id: crypto.randomUUID(),
          type,
          ref: type === "summary" ? null : selected,
        },
      ],
    });
    setAdding(false);
    setError(false);
  };
  return (
    <div className="steuerung-editor">
      <Button role="ghost" onClick={cancel}>
        ← Zurück zu Inhalte
      </Button>
      <h2 className="h2">
        {initial ? "Unterrichtsverlauf bearbeiten" : "Neuer Unterrichtsverlauf"}
      </h2>
      <label className="steuerung-editor__name">
        Name
        <input
          className="input"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          aria-invalid={error && !draft.name.trim()}
        />
      </label>
      {error && !draft.name.trim() && (
        <p role="alert">Bitte gib einen Namen ein.</p>
      )}
      <h3 className="h3">Ablauf</h3>
      {error && !draft.steps.length && (
        <Alert status="warning">Füge mindestens einen Schritt hinzu.</Alert>
      )}
      <ol className="steuerung-steps">
        {draft.steps.map((step, index) => (
          <li
            key={step.id}
            className="steuerung-step"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragged) {
                move(dragged, step.id);
              }
              setDragged(null);
            }}
          >
            <span className="steuerung-step__number">{index + 1}</span>
            <div className="steuerung-step__card">
              <div>
                <strong>{typeNames[step.type]}</strong>
                <span>{stepTitle(chapterId, step)}</span>
              </div>
              {step.type !== "summary" && (
                <select
                  className="select__control"
                  aria-label={`Ressource für Schritt ${index + 1}`}
                  value={step.ref ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      steps: draft.steps.map((item) =>
                        item.id === step.id
                          ? { ...item, ref: event.target.value }
                          : item,
                      ),
                    })
                  }
                >
                  {resources(chapterId, step.type).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className="icon-btn"
                draggable
                onDragStart={() => setDragged(step.id)}
                onDragEnd={() => setDragged(null)}
                aria-label={`Schritt ${index + 1} verschieben, ${typeNames[step.type]}: ${stepTitle(chapterId, step)}. Mit Pfeil hoch und Pfeil runter verschieben.`}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" && index > 0) {
                    event.preventDefault();
                    const before = draft.steps[index - 1];
                    if (before) {
                      move(step.id, before.id);
                    }
                  }
                  if (
                    event.key === "ArrowDown" &&
                    index < draft.steps.length - 1
                  ) {
                    event.preventDefault();
                    const after = draft.steps[index + 1];
                    if (after) {
                      move(step.id, after.id);
                    }
                  }
                }}
              >
                <GripVertical aria-hidden="true" />
              </button>
              <Button
                role="ghost"
                size="sm"
                aria-label={`Schritt ${index + 1} entfernen`}
                onClick={() =>
                  setDraft({
                    ...draft,
                    steps: draft.steps.filter((item) => item.id !== step.id),
                  })
                }
              >
                <Trash2 className="icon icon--sm" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {adding ? (
        <div className="steuerung-add-step">
          <fieldset>
            <legend>Schrittart</legend>
            {(Object.keys(typeNames) as StepType[]).map((item) => (
              <label key={item}>
                <input
                  type="radio"
                  name="step-type"
                  checked={type === item}
                  onChange={() => {
                    setType(item);
                    setRef("");
                  }}
                />
                {typeNames[item]}
              </label>
            ))}
          </fieldset>
          {options.length ? (
            <select
              className="select__control"
              aria-label="Inhalt auswählen"
              value={selected}
              onChange={(event) => setRef(event.target.value)}
            >
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          ) : (
            <p>Dieses Kapitel hat keine {typeNames[type]}.</p>
          )}
          <Button
            size="sm"
            disabled={
              !options.length ||
              (type === "summary" &&
                draft.steps.some((item) => item.type === "summary"))
            }
            onClick={add}
          >
            Schritt hinzufügen
          </Button>
          <Button role="ghost" size="sm" onClick={() => setAdding(false)}>
            Abbrechen
          </Button>
        </div>
      ) : (
        <Button role="secondary" onClick={() => setAdding(true)}>
          <Plus className="icon" />
          Schritt hinzufügen
        </Button>
      )}
      <div className="steuerung-editor__save">
        <span>{draft.name || "Neuer Unterrichtsverlauf"}</span>
        <Button role="secondary" onClick={cancel}>
          Abbrechen
        </Button>
        <Button
          onClick={() => {
            if (!draft.name.trim() || !draft.steps.length) {
              setError(true);
              return;
            }
            drafts.delete(draftKey);
            onSave({ ...draft, name: draft.name.trim() });
          }}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}

/** Chapter resources and the Unterrichtsverlauf editor. */
// The six resource sections follow the prototype's reading order.
// eslint-disable-next-line max-lines-per-function
export function Inhalte({ course }: { course: Course }) {
  const chapters = chaptersInOrder(course);
  const currentChapter = chapters.find((chapter) => chapter.current);
  const chapterMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!chapterMenu.current?.contains(event.target as Node)) {
        chapterMenu.current?.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && chapterMenu.current?.open) {
        chapterMenu.current.open = false;
        chapterMenu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const [params, setParams] = useSearchParams();
  const previous = editorSessions.get(course.id);
  const viewed =
    chapters.find((item) => item.id === params.get("kapitel")) ??
    chapters.find((item) => item.id === previous?.chapterId) ??
    chapters.find((item) => item.current) ??
    chapters[0];
  const [editing, setEditing] = useState<Unterrichtsverlauf | "new" | null>(
    previous?.editing ?? null,
  );
  const edit = (value: Unterrichtsverlauf | "new" | null) => {
    setEditing(value);
    if (viewed) {
      editorSessions.set(course.id, { chapterId: viewed.id, editing: value });
    }
  };
  const viewChapter = (chapterId: string) => {
    setParams({ kapitel: chapterId });
    editorSessions.set(course.id, { chapterId, editing: null });
    setEditing(null);
    if (chapterMenu.current) {
      chapterMenu.current.open = false;
    }
  };
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const store = flowStore(viewed?.id ?? "");
  const flows = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  if (!viewed) {
    return <EmptyState title="Noch keine Kapitel" />;
  }
  const lesson = getLesson(viewed.id);
  const worksheets = getWorksheetChapter(viewed.id, "teacher");
  const summary = getSummary(viewed.id);
  if (editing) {
    return (
      <Editor
        key={editing === "new" ? `new-${viewed.id}` : editing.id}
        chapterId={viewed.id}
        initial={editing === "new" ? null : editing}
        onCancel={() => edit(null)}
        onSave={(flow) => {
          store.save(flow);
          edit(null);
        }}
      />
    );
  }
  const section = (
    id: string,
    title: string,
    body: ReactNode,
    action?: ReactNode,
  ) => (
    <section className="steuerung-content-section" aria-labelledby={id}>
      <div className="steuerung-content-head">
        <h2 id={id} className="h2">
          {title}
        </h2>
        {action}
      </div>
      {body}
    </section>
  );
  return (
    <div className="steuerung-stack">
      <div className="steuerung-content-intro">
        <nav
          className="steuerung-chapter-nav"
          aria-label="Kapitelinhalt wählen"
        >
          <details className="steuerung-chapter-menu" ref={chapterMenu}>
            <summary>
              Kapitel wählen
              <ChevronDown className="icon icon--sm" aria-hidden="true" />
            </summary>
            <div className="steuerung-chapter-menu__list">
              {course.topics.map((topic) => (
                <div className="steuerung-chapter-menu__group" key={topic.id}>
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
                      onClick={() => viewChapter(chapter.id)}
                    >
                      <span>
                        {chapter.number} {chapter.title}
                      </span>
                      {chapter.id === currentChapter?.id && (
                        <small>Aktuell</small>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </details>
          {!viewed.current && currentChapter && (
            <button
              type="button"
              className="steuerung-chapter-nav__return"
              onClick={() => viewChapter(currentChapter.id)}
              aria-label={
                "Zum aktuellen Kapitel " +
                currentChapter.number +
                " " +
                currentChapter.title
              }
            >
              Zum aktuellen Kapitel · {currentChapter.number}
            </button>
          )}
        </nav>
        <ChapterHeading chapter={viewed} />
      </div>
      {section(
        "flows",
        "Unterrichtsverläufe",
        flows.length ? (
          <ul className="steuerung-resource-list">
            {flows.map((item) => (
              <li key={item.id}>
                <strong>{item.name}</strong>
                <div>
                  <Button role="secondary" size="sm" onClick={() => edit(item)}>
                    Bearbeiten
                  </Button>
                  <Button
                    role="ghost"
                    size="sm"
                    aria-label={`${item.name} entfernen`}
                    onClick={() => setDeleteId(item.id)}
                  >
                    <Trash2 className="icon icon--sm" />
                  </Button>
                </div>
                {deleteId === item.id && (
                  <Alert status="warning">
                    „{item.name}“ verschwindet aus dem Kapitel, auch für andere
                    Klassen. Die referenzierten Inhalte bleiben erhalten.{" "}
                    <Button
                      role="destructive"
                      size="sm"
                      onClick={() => {
                        store.remove(item.id);
                        setDeleteId(null);
                      }}
                    >
                      Entfernen
                    </Button>
                    <Button
                      role="ghost"
                      size="sm"
                      onClick={() => setDeleteId(null)}
                    >
                      Abbrechen
                    </Button>
                  </Alert>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Noch keine Unterrichtsverläufe" />
        ),
        <Button onClick={() => edit("new")}>
          Neuen Unterrichtsverlauf erstellen
        </Button>,
      )}
      {section(
        "frames",
        "Lesson Frames",
        lesson?.lessons.length ? (
          <ul className="steuerung-resource-list">
            {lesson.lessons.map((part) => (
              <li key={part.number}>
                <strong>{part.title}</strong>
                <span>
                  {
                    lesson.frames.filter(
                      (frame) => frame.lesson === part.number,
                    ).length
                  }{" "}
                  Folien
                </span>
                <Link
                  className={buttonClassName({ size: "sm", role: "secondary" })}
                  to={`${chapterPath(course.id, viewed.id)}/lesson?start=${lesson.frames.find((frame) => frame.lesson === part.number)?.id ?? ""}`}
                >
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Keine Lesson Frames" />
        ),
      )}
      {section(
        "quizzes",
        "Quizze",
        resources(viewed.id, "quiz").length ? (
          <ul className="steuerung-resource-list">
            {resources(viewed.id, "quiz").map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <Link
                  to={`${chapterPath(course.id, viewed.id)}/lesson?start=${item.id}`}
                >
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Keine Quizze" />
        ),
      )}
      {section(
        "sheets",
        "Arbeitsblätter",
        worksheets?.sheets.length ? (
          <ul className="steuerung-resource-list">
            {worksheets.sheets.map((sheet) => (
              <li key={sheet.id}>
                <strong>
                  {sheet.number}) {sheet.title}
                </strong>
                <span>
                  {sheet.sections.map((part) => part.title).join(" · ")}
                </span>
                <Link
                  to={`${chapterPath(course.id, viewed.id)}/sheets/${sheet.id}`}
                >
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Keine Arbeitsblätter" />
        ),
      )}
      {section(
        "challenges",
        "Challenges",
        worksheets?.challenges.length ? (
          <ul className="steuerung-resource-list">
            {worksheets.challenges.map((challenge) => (
              <li key={challenge.id}>
                <strong>{challenge.title}</strong>
                {challenge.requires.length > 0 && (
                  <span>Nach {challenge.requires.join(", ")}</span>
                )}
                <Link to={`${chapterPath(course.id, viewed.id)}/challenges`}>
                  Öffnen
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Keine Challenges" />
        ),
      )}
      {section(
        "summary",
        "Zusammenfassung",
        summary ? (
          <ul className="steuerung-resource-list">
            <li>
              <strong>Zusammenfassung</strong>
              <Badge status="info">
                {summary.match(/^## /gm)?.length ?? 0} Merkkarten
              </Badge>
              <Link to={`${chapterPath(course.id, viewed.id)}#zusammenfassung`}>
                Öffnen
              </Link>
            </li>
          </ul>
        ) : (
          <EmptyState title="Keine Zusammenfassung" />
        ),
      )}
    </div>
  );
}
