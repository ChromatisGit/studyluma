import { useCallback } from "react";
import type { MathEditor } from "../domain/editor";
import { useWorksheet } from "./WorksheetContext";
import { usesSemicolon } from "./fieldValues";
import type { KeyAction } from "./keyboard";

/** Runs keypad and keyboard actions on the active math field. */
export function useMathKeys(onMessage?: (message: string) => void) {
  const worksheet = useWorksheet();
  const {
    active,
    edit,
    checkAufgabe,
    checkStep,
    resultFor,
    deactivate,
    openKeys,
    index,
  } = worksheet;

  return useCallback(
    (action: KeyAction, semicolonMessage?: string) => {
      if (!active) {
        return;
      }
      const run = (command: (editor: MathEditor) => void, save = true) =>
        edit(command, save);
      switch (action.kind) {
        case "char":
          return run((editor) => editor.char(action.value));
        case "frac":
          return run((editor) => editor.frac(action.fromKeyboard));
        case "sqrt":
          return run((editor) => editor.sqrt());
        case "squared":
          return run((editor) => editor.sup(true));
        case "power":
          return run((editor) => editor.sup());
        case "superscript":
          return run((editor) => editor.power(action.digit));
        case "left":
          return run((editor) => editor.left(), false);
        case "right":
          return run((editor) => editor.right(), false);
        case "back":
          return run((editor) => editor.back());
        case "close":
          return openKeys(false);
        case "semicolon": {
          const kind = index.parts.get(active.ref.partId)?.part.answerKind;
          if (usesSemicolon(kind, active.ref)) {
            return run((editor) => editor.char(";"));
          }
          if (semicolonMessage) {
            onMessage?.(semicolonMessage);
          }
          return undefined;
        }
        case "check": {
          const { ref } = active;
          if (ref.stepId) {
            checkStep(ref.partId, ref.stepId);
          } else {
            const aufgabeId = index.parts.get(ref.partId)?.info.aufgabe.id;
            if (aufgabeId) {
              checkAufgabe(aufgabeId);
            }
          }
          // Correct: the keypad has done its job; close it so the result shows.
          if (resultFor(ref)?.state === "richtig") {
            deactivate();
            (document.activeElement as HTMLElement | null)?.blur();
          }
          return undefined;
        }
      }
    },
    [
      active,
      edit,
      checkAufgabe,
      checkStep,
      resultFor,
      deactivate,
      openKeys,
      index,
      onMessage,
    ],
  );
}
