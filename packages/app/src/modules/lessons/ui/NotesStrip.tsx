import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, EyeOff, Undo2 } from "lucide-react";
import {
  RichContent,
  walkInlines,
  type RichNode,
} from "../../content-renderer";
import { fill } from "../../../helper/text";
import { QuizActions, type QuizActionsProps } from "./QuizActions";
import TEXT from "./lessons.de.json";

export interface NotesStripProps {
  number: string;
  heading?: string | undefined;
  /** The private notes of the slide. */
  notes: RichNode[];
  /** Notes only open while a projector window is connected, or on request. */
  visible: boolean;
  onShowAnyway: () => void;
  next?: { title: string } | undefined;
  onNext: () => void;
  back?: { number: string } | undefined;
  onBack: () => void;
  sheet?: { sent: boolean } | undefined;
  onSend: () => void;
  /** On a quiz frame: start it and move it on. */
  quiz?: QuizActionsProps | undefined;
  actions?: ReactNode;
}

function notePreview(nodes: RichNode[]): string {
  const words: string[] = [];
  walkInlines(nodes, (inline) => {
    if (inline.type === "text") {
      words.push(inline.value);
    } else if (inline.type === "math") {
      words.push(inline.source);
    }
  });
  return words.join(" ").trim();
}

/**
 * One line above the stage: the frame's note, its action and "Nächster".
 * Opened, the same strip grows down over the stage with the whole note.
 */
export function NotesStrip(props: NotesStripProps) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!props.visible) {
      setOpen(false);
    }
  }, [props.visible]);
  const expanded = open && props.visible;
  const preview = props.visible
    ? props.notes.length
      ? notePreview(props.notes)
      : TEXT.notes.none
    : TEXT.notes.protected;
  return (
    <div className={`lt-notes${expanded ? " is-open" : ""}`}>
      <div className="lt-notes__row">
        <button
          type="button"
          className="lt-notes__toggle"
          aria-expanded={expanded}
          onClick={() => props.visible && setOpen(!open)}
        >
          <EyeOff className="lt-notes__icon" aria-hidden="true" />
          <span className="lt-notes__heading">
            {props.visible
              ? (props.heading ??
                fill(TEXT.notes.heading, { number: props.number }))
              : TEXT.notes.collapsed}
          </span>
          {!expanded && <span className="lt-notes__preview">{preview}</span>}
          {props.visible && (
            <ChevronDown className="lt-notes__chevron" aria-hidden="true" />
          )}
        </button>
        {!props.visible && (
          <button
            type="button"
            className="lt-btn lt-btn--quiet"
            onClick={props.onShowAnyway}
          >
            {TEXT.notes.showAnyway}
          </button>
        )}
        {props.quiz && <QuizActions {...props.quiz} />}
        {props.actions}
        {props.sheet &&
          (props.sheet.sent ? (
            <span className="lt-notes__sent">
              <Check aria-hidden="true" />
              {TEXT.notes.sent}
            </span>
          ) : (
            <button type="button" className="lt-btn" onClick={props.onSend}>
              {TEXT.notes.send}
            </button>
          ))}
        {props.back && (
          <button
            type="button"
            className="lt-btn lt-btn--back"
            onClick={props.onBack}
          >
            <Undo2 aria-hidden="true" />
            {fill(TEXT.notes.back, { number: props.back.number })}
          </button>
        )}
        {props.next && (
          <>
            <span className="lt-head__sep" />
            <button
              type="button"
              className="lt-notes__next"
              aria-label={fill(TEXT.notes.nextAria, {
                title: props.next.title,
              })}
              onClick={props.onNext}
            >
              <span className="lt-notes__next-label">{TEXT.notes.next}</span>
              <span className="lt-notes__next-title">{props.next.title}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {expanded && (
        <div className="lt-notes__body">
          {props.notes.length ? (
            <RichContent nodes={props.notes} className="lt-notes__text" />
          ) : (
            <p className="lt-notes__text">{TEXT.notes.none}</p>
          )}
        </div>
      )}
    </div>
  );
}
