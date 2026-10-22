import {
  useEffect,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import {
  RichInlineContent,
  type RichInline,
  type RichNode,
} from "../../content-renderer";
import { fill } from "../../../helper/text";
import type { TaskPart } from "../../catalog";
import { MathView } from "./MathView";
import { InlineMark } from "./Mark";
import { useWorksheet } from "./WorksheetContext";
import type { FieldRef } from "./fieldValues";
import { KeypadButtons } from "./KeypadButtons";
import { refLabel, TEXT } from "./texts";
import { useMathKeys } from "./useMathKeys";

/** The first paragraph of a part's text, for the display line. */
function firstLine(nodes: RichNode[]): RichInline[] {
  const node = nodes.find(
    (candidate) =>
      candidate.type === "paragraph" || candidate.type === "heading",
  );
  return node && "children" in node ? node.children : [];
}

/** The task in one line: what the active field belongs to. */
function PromptLine({ part, field }: { part: TaskPart; field: FieldRef }) {
  const { index } = useWorksheet();
  const entry = index.parts.get(part.id);
  const label = `${entry?.info.number ?? ""}${entry?.letter ?? ""}`;
  let number = label;
  let text: ReactNode = null;
  if (field.stepId) {
    const steps = part.steps?.items ?? [];
    const at = steps.findIndex((s) => s.id === field.stepId);
    number = fill(TEXT.keypad.step, { ref: label, number: at + 1 });
    text = (
      <RichInlineContent
        nodes={steps[at]?.content ?? []}
        renderGap={(id) => (id === field.gapId ? <b>□</b> : "…")}
      />
    );
  } else if (field.gapId && part.type === "Einsetzen") {
    text = (
      <RichInlineContent
        nodes={firstLine(part.content)}
        renderGap={(id) => (id === field.gapId ? <b>□</b> : "…")}
      />
    );
  } else {
    text = <RichInlineContent nodes={firstLine(part.content)} />;
  }
  return (
    <>
      <span className="kp-display__num">{number}</span>
      <span className="kp-display__text">{text}</span>
    </>
  );
}

/** Task, answer and mark together, like a calculator's display. */
function KeypadDisplay({ part, message }: { part: TaskPart; message: string }) {
  const { active, keysOpen, openKeys, resultFor, edit } = useWorksheet();
  const [expanded, setExpanded] = useState(false);
  if (!active) {
    return null;
  }
  const result = resultFor(active.ref);
  return (
    <div className="kp-display">
      <button
        type="button"
        className="kp-display__prompt"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <PromptLine part={part} field={active.ref} />
      </button>
      <div className="kp-display__row">
        <div className="kp-display__val" aria-hidden="true">
          <MathView
            row={active.editor.root}
            cursor={active.editor.cursor}
            place={(row, i) => edit((editor) => editor.place(row, i), false)}
          />
        </div>
        {result && <InlineMark state={result.state} />}
        {!keysOpen && (
          <button
            type="button"
            className="btn btn--secondary btn--sm kp-expand"
            onClick={() => openKeys(true)}
          >
            {TEXT.keypad.keys}
          </button>
        )}
      </div>
      {message && (
        <p className="kp-display__msg" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * The calculator-like keypad, docked at the bottom. Its display row keeps
 * task, answer and mark together; on computers only the display shows,
 * with "Tastenfeld" to unfold the keys.
 */
export function Keypad() {
  const worksheet = useWorksheet();
  const { active, index, keysOpen, resultFor } = worksheet;
  const [message, setMessage] = useState<string | null>(null);
  const runKey = useMathKeys(setMessage);

  useEffect(() => {
    setMessage(null);
  }, [active?.ref.key]);

  useEffect(() => {
    document.body.classList.toggle("has-keypad", !!active);
    return () => document.body.classList.remove("has-keypad");
  }, [active]);

  if (!active) {
    return null;
  }
  const part = index.parts.get(active.ref.partId)?.part;
  if (!part) {
    return null;
  }
  const variable = part.variable ?? "x";
  const result = resultFor(active.ref);
  const info = index.parts.get(part.id)?.info;

  const shownMessage =
    message ?? [result?.message, result?.note].filter(Boolean).join(" ");
  // No tap anywhere on the keypad, keys, gaps or display, takes the focus
  // from the field. Safari on iOS does not always honour pointerdown alone.
  const keepFocus = (event: SyntheticEvent) => event.preventDefault();

  return (
    <div
      className={`keypad${keysOpen ? "" : " is-bar"}`}
      aria-label={info ? refLabel(info) : undefined}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
    >
      <div className="kp-inner">
        <KeypadDisplay part={part} message={shownMessage} />
        {keysOpen && (
          <KeypadButtons
            key={active.ref.key}
            variable={variable}
            onAction={(action) => runKey(action, TEXT.keypad.semicolon)}
            onMessage={setMessage}
          />
        )}
      </div>
    </div>
  );
}
