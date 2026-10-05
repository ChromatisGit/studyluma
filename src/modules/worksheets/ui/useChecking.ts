import { useCallback, type Dispatch, type SetStateAction } from "react";
import { checkAufgabe as runCheck } from "../application/checkAufgabe";
import { checkGap, checkGaps } from "../domain/check";
import type { CheckResult, PartResponse } from "../domain/contract";
import type { ChapterIndex } from "../domain/structure";
import type { LocalChapterStore } from "../infrastructure/localChapterStore";
import type { FieldRef } from "./fieldValues";
import { checkMessages } from "./texts";
import type { UiState } from "./uiState";

/** Prüfen: checks an Aufgabe or a Rechenweg line and records the result. */
export function useChecking(
  index: ChapterIndex,
  store: LocalChapterStore,
  response: (partId: string) => PartResponse,
  help: Record<string, number>,
  setUi: Dispatch<SetStateAction<UiState>>,
) {
  const checkAufgabe = useCallback(
    (aufgabeId: string) => {
      const info = index.aufgaben.get(aufgabeId);
      if (!info) {
        return;
      }
      const result = runCheck(info, store.getSnapshot(), help, checkMessages);
      for (const [partId, next] of Object.entries(result.responses)) {
        store.setResponse(partId, next);
      }
      setUi((current) => ({
        ...current,
        help: {
          ...current.help,
          ...Object.fromEntries(result.openHelp.map((id) => [id, 1])),
        },
        newMarks: Object.fromEntries(result.marked.map((id) => [id, true])),
        emptyNote: { ...current.emptyNote, [aufgabeId]: result.empty },
      }));
    },
    [index, store, help, setUi],
  );

  const checkStep = useCallback(
    (partId: string, stepId: string) => {
      const step = index.parts
        .get(partId)
        ?.part.steps?.find((s) => s.id === stepId);
      const current = response(partId);
      const values = current.steps?.[stepId]?.value as
        Record<string, unknown> | undefined;
      const own = step?.gaps
        ? checkGaps(step.gaps, values, checkMessages)
        : null;
      if (!own) {
        return;
      }
      store.setResponse(partId, {
        ...current,
        steps: {
          ...(current.steps ?? {}),
          [stepId]: { value: values ?? {}, lastCheck: own },
        },
      });
      setUi((state_) => ({ ...state_, newMarks: { [stepId]: true } }));
    },
    [index, store, response, setUi],
  );

  /** The result an input shows: its step, its own gap or cell, or the part. */
  const resultFor = useCallback(
    (ref: Omit<FieldRef, "key">): CheckResult | null => {
      const current = store.getSnapshot().responses[ref.partId];
      if (ref.stepId) {
        return current?.steps?.[ref.stepId]?.lastCheck ?? null;
      }
      if (ref.gapId) {
        const state_ = current?.lastCheck?.items?.[ref.gapId];
        if (!state_) {
          return null;
        }
        const part = index.parts.get(ref.partId)?.part;
        const gap =
          part?.task.type === "lueckentext"
            ? part.task.gaps.find((g) => g.id === ref.gapId)
            : undefined;
        const own =
          state_ === "fast" && gap
            ? checkGap(
                gap,
                (current?.value as Record<string, unknown>)?.[gap.id],
                checkMessages,
              )
            : null;
        return {
          state: state_,
          ...(own?.message ? { message: own.message } : {}),
        };
      }
      return current?.lastCheck ?? null;
    },
    [index, store],
  );

  return { checkAufgabe, checkStep, resultFor };
}
