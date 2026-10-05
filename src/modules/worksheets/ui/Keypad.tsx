import { useEffect, useState, type ReactNode } from "react";
import { Markdown } from "../../content";
import { fill } from "../../../helper/text";
import type { Part } from "../domain/contract";
import { MathView } from "./MathView";
import { InlineMark } from "./Mark";
import { useWorksheet } from "./WorksheetContext";
import type { FieldRef } from "./fieldValues";
import {
  digitKeys,
  functionKeys,
  letterKeys,
  topKeys,
  type KeyDef,
  type KeypadPage,
} from "./keypadKeys";
import { refLabel, TEXT, plainText } from "./texts";
import { useMathKeys } from "./useMathKeys";

const firstLine = (markdown: string) =>
  markdown.split("\n").find((line) => line.trim()) ?? "";

/** The task in one line: what the active field belongs to. */
function PromptLine({ part, field }: { part: Part; field: FieldRef }) {
  const { index } = useWorksheet();
  const info = index.parts.get(part.id)?.info;
  const label = `${info?.aufgabe.number ?? ""}${part.letter ?? ""}`;
  const task = part.task;
  let number = label;
  let text: ReactNode = null;
  if (field.stepId) {
    const steps = part.steps ?? [];
    const step = steps.find((s) => s.id === field.stepId);
    number = fill(TEXT.keypad.step, {
      ref: label,
      number: steps.indexOf(step as never) + 1,
    });
    text = (
      <Markdown
        inline
        markdown={`${step?.name ?? ""} ${step?.line ?? ""}`}
        renderGap={() => "□"}
      />
    );
  } else if (field.gapId && task.type === "lueckentext") {
    const gap = task.gaps.find((g) => g.id === field.gapId);
    text = gap?.cell ? (
      fill(TEXT.keypad.at, {
        row: plainText(gap.cell.row),
        column: plainText(gap.cell.column),
      })
    ) : (
      <Markdown
        inline
        markdown={firstLine(task.body)}
        renderGap={(i) => (task.gaps[i]?.id === field.gapId ? <b>□</b> : "…")}
      />
    );
  } else if ("prompt" in task) {
    text = <Markdown inline markdown={firstLine(task.prompt)} />;
  }
  return (
    <>
      <span className="kp-display__num">{number}</span>
      <span className="kp-display__text">{text}</span>
    </>
  );
}

function KeyButton({
  def,
  onPress,
}: {
  def: KeyDef;
  onPress: (def: KeyDef) => void;
}) {
  return (
    <button
      type="button"
      className={`kp-key kp-key--${def.className ?? "op"}`}
      aria-label={def.aria}
      aria-disabled={def.later ? true : undefined}
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => onPress(def)}
    >
      {def.label}
    </button>
  );
}

/** Task, answer and mark together, like a calculator's display. */
function KeypadDisplay({ part, message }: { part: Part; message: string }) {
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
        onPointerDown={(event) => event.preventDefault()}
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
            onPointerDown={(event) => event.preventDefault()}
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
  const [page, setPage] = useState<KeypadPage>("123");
  const [message, setMessage] = useState<string | null>(null);
  const runKey = useMathKeys(setMessage);

  useEffect(() => {
    setPage("123");
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
  const gaps = active.ref.stepId
    ? part.steps?.find((s) => s.id === active.ref.stepId)?.gaps
    : part.task.type === "lueckentext"
      ? part.task.gaps
      : undefined;
  const gap = gaps?.find((g) => g.id === active.ref.gapId);
  const answer =
    gap?.kind === "math"
      ? gap.answer
      : part.task.type === "ergebnis"
        ? part.task.answer
        : undefined;
  const variable = answer?.kind === "term" ? (answer.variables[0] ?? "x") : "x";
  const result = resultFor(active.ref);
  const info = index.parts.get(part.id)?.info;

  const press = (def: KeyDef) => {
    if (def.page) {
      setPage(def.page);
      return;
    }
    if (def.later) {
      setMessage(fill(TEXT.keypad.laterMessage, { key: def.later }));
      return;
    }
    if (def.action) {
      setMessage(null);
      runKey(def.action, TEXT.keypad.semicolon);
      if (def.className === "letter") {
        setPage("123");
      }
    }
  };
  const lower =
    page === "abc" ? letterKeys : page === "fx" ? functionKeys : digitKeys;
  const shownMessage =
    message ?? [result?.message, result?.note].filter(Boolean).join(" ");

  return (
    <div
      className={`keypad${keysOpen ? "" : " is-bar"}`}
      aria-label={info ? refLabel(info) : undefined}
    >
      <div className="kp-inner">
        <KeypadDisplay part={part} message={shownMessage} />
        {keysOpen && (
          <div className="kp-keys">
            <div className="kp-top">
              {topKeys(variable).map((def) => (
                <KeyButton key={def.id} def={def} onPress={press} />
              ))}
            </div>
            <div className={`kp-lower kp-lower--${page}`}>
              {lower.map((def) => (
                <KeyButton key={def.id} def={def} onPress={press} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
