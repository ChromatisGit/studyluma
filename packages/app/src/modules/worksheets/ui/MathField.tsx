import {
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { CheckState } from "../domain/contract";
import { speak } from "../domain/editor";
import { typstToRow } from "@studyluma/catalog-contract";
import { MathView } from "./MathView";
import { useWorksheet } from "./WorksheetContext";
import { readField, type FieldRef } from "./fieldValues";
import { keyboardAction } from "./keyboard";
import { isMathTarget } from "./useActiveField";
import { speechWords } from "./texts";
import { useMathKeys } from "./useMathKeys";

export interface MathFieldProps {
  field: FieldRef;
  label: string;
  small?: boolean;
  /** Right and done: shown, but no longer editable. */
  locked?: boolean;
  state?: CheckState | undefined;
  className?: string;
  segments?: (CheckState | undefined)[] | undefined;
}

/** A field that just became right lets go of the cursor and the keypad. */
function useReleaseWhenLocked(
  locked: boolean,
  holds: boolean,
  release: () => void,
) {
  const element = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!locked) {
      return;
    }
    if (element.current?.contains(document.activeElement)) {
      (document.activeElement as HTMLElement).blur();
    }
    if (holds) {
      release();
    }
  }, [locked, holds, release]);
  return element;
}

/** Focus and taps that make a field active, and focus that ends it. */
function useFieldFocus(field: FieldRef, locked: boolean) {
  const { activate, deactivate } = useWorksheet();
  const onBlur = () =>
    setTimeout(() => {
      // Focus that moved on (Tab, another input) ends the field. Focus that
      // fell to the page is left to the tap check in useActiveField.
      const next = document.activeElement;
      if (next && next !== document.body && !isMathTarget(next)) {
        deactivate();
      }
    }, 0);
  if (locked) {
    return { onBlur };
  }
  return {
    onBlur,
    onFocus: (event: FocusEvent<HTMLSpanElement>) => {
      activate(field);
      const element = event.currentTarget;
      requestAnimationFrame(() => element.scrollIntoView({ block: "nearest" }));
    },
    // A tap on the field opens the keys again after "Schließen", and
    // focuses it where Safari did not.
    onPointerUp: (event: PointerEvent<HTMLSpanElement>) => {
      if (event.currentTarget.contains(document.activeElement)) {
        activate(field);
      } else {
        event.currentTarget.focus();
      }
    },
  };
}

/**
 * A math input. It never opens the system keyboard; typing goes through
 * the editor, and on touch devices the keypad slides up.
 */
export function MathField({
  field,
  label,
  small,
  locked = false,
  state,
  className,
  segments,
}: MathFieldProps) {
  const worksheet = useWorksheet();
  const { active, deactivate, index, response, edit } = worksheet;
  const runKey = useMathKeys();
  const holds = active?.ref.key === field.key;
  const isActive = !locked && holds;
  const element = useReleaseWhenLocked(locked, holds, deactivate);
  const focusHandlers = useFieldFocus(field, locked);
  const kind = index.parts.get(field.partId)?.part.answerKind;
  const stored = readField(response(field.partId), field, kind);
  const row = isActive && active ? active.editor.root : stored;

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key === "Escape") {
        worksheet.openKeys(false);
        return;
      }
      const action = keyboardAction(event);
      if (action) {
        event.preventDefault();
        runKey(action);
      }
    },
    [runKey, worksheet],
  );

  // Pasting plain text ("3/4", "12x^3", "sqrt(2)") inserts structure.
  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLSpanElement>) => {
      const text = event.clipboardData.getData("text");
      if (!text.trim()) {
        return;
      }
      event.preventDefault();
      try {
        const nodes = typstToRow(text.replace(/×/g, "*").replace(/:/g, "/"));
        edit((editor) => editor.insertRow(nodes));
      } catch {
        // Unreadable text is ignored.
      }
    },
    [edit],
  );

  return (
    <span
      ref={element}
      className={[
        "mfield",
        small && "mfield--sm",
        locked && "is-locked",
        isActive && "is-active",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-state={state}
      tabIndex={locked ? -1 : 0}
      role="textbox"
      aria-label={label}
      aria-readonly={locked || undefined}
      inputMode="none"
      {...focusHandlers}
      onKeyDown={locked ? undefined : onKeyDown}
      onPaste={locked ? undefined : onPaste}
    >
      <span className="mfield__val" aria-hidden="true">
        <MathView
          row={row}
          cursor={isActive ? active?.editor.cursor : null}
          place={
            isActive
              ? (target, i) => edit((editor) => editor.place(target, i), false)
              : undefined
          }
          segments={segments}
        />
      </span>
      <span className="visually-hidden">{speak(row, speechWords)}</span>
    </span>
  );
}
