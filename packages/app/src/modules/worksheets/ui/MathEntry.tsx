import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import { typstToRow } from "@studyluma/catalog-contract";
import { cloneRow, type MathRow } from "../../content-renderer";
import { MathEditor } from "../domain/editor";
import { KeypadButtons } from "./KeypadButtons";
import { MathView } from "./MathView";
import { editorCommand, keyboardAction, type KeyAction } from "./keyboard";
import "./worksheets.css";

export interface MathEntryProps {
  row: MathRow;
  label: string;
  /** Every edit, as a copy of the whole row. */
  onChange: (row: MathRow) => void;
  /** The letter on the variable key. */
  variable?: string;
  /** Takes the focus when it appears, for an entry just added. */
  autoFocus?: boolean;
  /** Shown, but not editable (the projector, a preview). */
  locked?: boolean;
  /** The field lost the focus: editing is over. */
  onDone?: () => void;
}

/** No tap on the keypad takes the focus from the field. */
const keepFocus = (event: SyntheticEvent) => event.preventDefault();

/**
 * The editor while the field has the focus. Every edit redraws the field and
 * reports the row; cursor moves only redraw.
 */
function useEntryEditor(row: MathRow, onChange: (row: MathRow) => void) {
  const [editor, setEditor] = useState<MathEditor | null>(null);
  const [, redraw] = useState(0);
  const run = (command: (editor: MathEditor) => void, save: boolean) => {
    if (!editor) {
      return;
    }
    command(editor);
    redraw((count) => count + 1);
    if (save) {
      onChange(cloneRow(editor.root));
    }
  };
  return {
    editor,
    run,
    start: () => setEditor(new MathEditor(cloneRow(row))),
    stop: () => setEditor(null),
  };
}

/** Pasting plain text ("3/4", "x^2", "sin(x)") inserts structure. */
function pasteInto(
  event: ClipboardEvent<HTMLSpanElement>,
  run: (command: (editor: MathEditor) => void, save: boolean) => void,
) {
  const text = event.clipboardData.getData("text");
  if (!text.trim()) {
    return;
  }
  event.preventDefault();
  try {
    const nodes = typstToRow(text.replace(/×/g, "*").replace(/:/g, "/"));
    run((editor) => editor.insertRow(nodes), true);
  } catch {
    // Unreadable text is ignored.
  }
}

/** The keypad at the bottom of the window, with the field's value on top. */
function DockedKeypad({
  label,
  variable,
  onAction,
  children,
}: {
  label: string;
  variable: string;
  onAction: (action: KeyAction) => void;
  children: ReactNode;
}) {
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div
      className="keypad"
      aria-label={label}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
    >
      <div className="kp-inner">
        <div className="kp-display">
          <div className="kp-display__row">
            <div className="kp-display__val" aria-hidden="true">
              {children}
            </div>
          </div>
          {message && (
            <p className="kp-display__msg" aria-live="polite">
              {message}
            </p>
          )}
        </div>
        <KeypadButtons
          variable={variable}
          onAction={onAction}
          onMessage={setMessage}
        />
      </div>
    </div>
  );
}

/**
 * A math input outside a worksheet. It types from the keyboard and, while
 * it has the focus, from the keypad docked at the bottom of the window.
 */
export function MathEntry({
  row,
  label,
  onChange,
  variable = "x",
  autoFocus = false,
  locked = false,
  onDone,
}: MathEntryProps) {
  const element = useRef<HTMLSpanElement>(null);
  const { editor, run, start, stop } = useEntryEditor(row, onChange);

  useEffect(() => {
    if (autoFocus && !locked) {
      element.current?.focus();
    }
  }, [autoFocus, locked]);

  const runKey = (action: KeyAction) => {
    const own = editorCommand(action);
    if (own) {
      run(own.command, own.save);
    } else if (action.kind === "check" || action.kind === "close") {
      element.current?.blur();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === "Escape") {
      element.current?.blur();
      return;
    }
    const action = keyboardAction(event);
    if (action) {
      event.preventDefault();
      runKey(action);
    }
  };
  const shown = editor ? editor.root : row;
  const view = (
    <MathView
      row={shown}
      cursor={editor?.cursor ?? null}
      place={
        editor
          ? (target, i) => run((current) => current.place(target, i), false)
          : undefined
      }
    />
  );
  const handlers = locked
    ? {}
    : {
        tabIndex: 0,
        onFocus: start,
        onBlur: () => {
          stop();
          onDone?.();
        },
        onKeyDown,
        onPaste: (event: ClipboardEvent<HTMLSpanElement>) =>
          pasteInto(event, run),
      };
  return (
    <>
      <span
        ref={element}
        className={[
          "mfield mfield--entry",
          editor && "is-active",
          locked && "is-locked",
        ]
          .filter(Boolean)
          .join(" ")}
        role="textbox"
        aria-label={label}
        aria-readonly={locked || undefined}
        inputMode="none"
        {...handlers}
      >
        <span className="mfield__val" aria-hidden="true">
          {view}
        </span>
      </span>
      {editor &&
        createPortal(
          <DockedKeypad label={label} variable={variable} onAction={runKey}>
            {view}
          </DockedKeypad>,
          document.body,
        )}
    </>
  );
}
