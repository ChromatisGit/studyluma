import { useCallback } from "react";
import { useWorksheet } from "./WorksheetContext";
import { usesSemicolon } from "./fieldValues";
import { editorCommand, type KeyAction } from "./keyboard";

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
      const own = editorCommand(action);
      if (own) {
        return edit(own.command, own.save);
      }
      switch (action.kind) {
        case "close":
          return openKeys(false);
        case "semicolon": {
          const kind = index.parts.get(active.ref.partId)?.part.answerKind;
          if (usesSemicolon(kind, active.ref)) {
            return edit((editor) => editor.char(";"));
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
