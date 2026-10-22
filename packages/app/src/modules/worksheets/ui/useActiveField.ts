import { useCallback, useEffect, useRef, useState } from "react";
import type { PartResponse } from "../domain/contract";
import { MathEditor } from "../domain/editor";
import { cloneRow } from "../../content-renderer";
import type { ChapterIndex } from "../domain/structure";
import { readField, type FieldRef } from "./fieldValues";

export type ActiveField = { ref: FieldRef; editor: MathEditor };

/** An editable math field or the keypad: taps there keep the field active. */
export const isMathTarget = (element: Element | null) =>
  !!element?.closest(".mfield:not(.is-locked), .keypad");

/** The math field being edited, its editor and whether the keys are open. */
export function useActiveField(
  index: ChapterIndex,
  response: (partId: string) => PartResponse,
  setInput: (ref: Omit<FieldRef, "key">, value: unknown) => void,
) {
  const [active, setActive] = useState<ActiveField | null>(null);
  const [, setVersion] = useState(0);
  const [keysOpen, setKeysOpen] = useState(false);
  const keysPreferred = useRef(false);

  const activate = useCallback(
    (ref: FieldRef, openKeys = false) => {
      const entry = index.parts.get(ref.partId);
      if (!entry) {
        return;
      }
      setActive((current) =>
        current?.ref.key === ref.key
          ? current
          : {
              ref,
              editor: new MathEditor(
                cloneRow(
                  readField(response(ref.partId), ref, entry.part.answerKind),
                ),
              ),
            },
      );
      const touch =
        typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          window.innerWidth < 700);
      setKeysOpen(openKeys || touch || keysPreferred.current);
    },
    [index, response],
  );

  const deactivate = useCallback(() => {
    setActive(null);
    setKeysOpen(false);
  }, []);

  // A tap outside the fields and the keypad ends the field. Focus is no
  // guide here: Safari on iOS drops it to the page on taps it should keep.
  const isOn = active !== null;
  useEffect(() => {
    if (!isOn) {
      return undefined;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!isMathTarget(event.target as Element)) {
        deactivate();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOn, deactivate]);

  /** Runs an editor command on the active field and saves the result. */
  const edit = useCallback(
    (command: (editor: MathEditor) => void, save = true) => {
      if (!active) {
        return;
      }
      command(active.editor);
      if (save) {
        setInput(active.ref, cloneRow(active.editor.root));
      }
      setVersion((version) => version + 1);
    },
    [active, setInput],
  );

  const openKeys = useCallback((open: boolean) => {
    keysPreferred.current = open;
    setKeysOpen(open);
  }, []);

  return { active, activate, deactivate, edit, keysOpen, openKeys };
}
