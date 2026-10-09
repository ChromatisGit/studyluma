import { useCallback, type ClipboardEvent, type KeyboardEvent } from "react";
import type { CheckState } from "../domain/contract";
import { speak } from "../domain/editor";
import { typstToRow } from "../domain/typst";
import { MathView } from "./MathView";
import { useWorksheet } from "./WorksheetContext";
import { readField, type FieldRef } from "./fieldValues";
import { keyboardAction } from "./keyboard";
import { speechWords } from "./texts";
import { useMathKeys } from "./useMathKeys";

export interface MathFieldProps {
  field: FieldRef;
  label: string;
  small?: boolean;
  state?: CheckState | undefined;
  className?: string;
  segments?: (CheckState | undefined)[] | undefined;
}

const isMathTarget = (element: Element | null) =>
  !!element?.closest(".mfield, .keypad");

/**
 * A math input. It never opens the system keyboard; typing goes through
 * the editor, and on touch devices the keypad slides up.
 */
export function MathField({
  field,
  label,
  small,
  state,
  className,
  segments,
}: MathFieldProps) {
  const worksheet = useWorksheet();
  const { active, activate, deactivate, index, response, edit } = worksheet;
  const runKey = useMathKeys();
  const isActive = active?.ref.key === field.key;
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
      className={[
        "mfield",
        small && "mfield--sm",
        isActive && "is-active",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-state={state}
      tabIndex={0}
      role="textbox"
      aria-label={label}
      inputMode="none"
      onFocus={(event) => {
        activate(field);
        const element = event.currentTarget;
        requestAnimationFrame(() =>
          element.scrollIntoView({ block: "nearest" }),
        );
      }}
      onBlur={() =>
        setTimeout(() => {
          if (!isMathTarget(document.activeElement)) {
            deactivate();
          }
        }, 0)
      }
      onKeyDown={onKeyDown}
      onPaste={onPaste}
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
