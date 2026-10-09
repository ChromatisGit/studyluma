import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { CheckResult, PartResponse } from "../domain/contract";
import {
  helpLadder,
  isCheckable,
  recordCheck,
  type AufgabeInfo,
  type ChapterIndex,
  type SheetsData,
} from "../domain/structure";
import type { LocalChapterStore } from "../infrastructure/localChapterStore";
import type { FieldRef } from "./fieldValues";
import type { UiState } from "./uiState";

const isEmpty = (value: unknown) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  // A solution set holds a row and the switch "no solution".
  const set = value as { row?: unknown[]; none?: boolean };
  return (
    typeof value === "object" &&
    Array.isArray(set.row) &&
    !set.row.length &&
    !set.none
  );
};

async function ask(data: SheetsData, body: Record<string, string>) {
  const form = new FormData();
  form.set("buildId", data.buildId);
  for (const [key, value] of Object.entries(body)) {
    form.set(key, value);
  }
  const result = await fetch("/api/check", { method: "POST", body: form });
  return result.ok ? ((await result.json()) as CheckResult) : null;
}

type Checked = {
  responses: Record<string, PartResponse>;
  marked: string[];
  openHelp: string[];
  empty: boolean;
};

/** Sends every answered, checkable part of a task to the server. */
async function checkParts(
  data: SheetsData,
  info: AufgabeInfo,
  store: LocalChapterStore,
  response: (partId: string) => PartResponse,
  help: Record<string, number>,
): Promise<Checked> {
  const result: Checked = {
    responses: {},
    marked: [],
    openHelp: [],
    empty: true,
  };
  for (const { part } of info.parts) {
    const current = response(part.id);
    if (!isCheckable(part) || isEmpty(current.value)) {
      continue;
    }
    result.empty = false;
    try {
      const checked = await ask(data, {
        kind: "part",
        partId: part.id,
        answer: JSON.stringify(current.value),
      });
      if (!checked) {
        continue;
      }
      const next = recordCheck(current, checked);
      result.responses[part.id] = next;
      result.marked.push(part.id);
      if (
        next.wrongChecks >= 2 &&
        helpLadder(part, info, store.getSnapshot(), data).length &&
        !help[part.id]
      ) {
        result.openHelp.push(part.id);
      }
    } catch {
      /* The answer remains saved; it can be checked again. */
    }
  }
  return result;
}

/**
 * Prüfen: asks the server to check an Aufgabe or a Rechenweg line and
 * records the result. The expected answers never reach the browser.
 */
export function useChecking(
  data: SheetsData,
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
      void checkParts(data, info, store, response, help).then((result) => {
        Object.entries(result.responses).forEach(([partId, next]) =>
          store.setResponse(partId, next),
        );
        setUi((current) => ({
          ...current,
          help: {
            ...current.help,
            ...Object.fromEntries(result.openHelp.map((id) => [id, 1])),
          },
          newMarks: Object.fromEntries(result.marked.map((id) => [id, true])),
          emptyNote: { ...current.emptyNote, [aufgabeId]: result.empty },
        }));
      });
    },
    [data, index, store, response, help, setUi],
  );

  const checkStep = useCallback(
    (partId: string, stepId: string) => {
      const current = response(partId);
      const values = current.steps?.[stepId]?.value as
        Record<string, unknown> | undefined;
      void (async () => {
        try {
          const own = await ask(data, {
            kind: "step",
            partId,
            stepId,
            answer: JSON.stringify(values ?? {}),
          });
          if (!own) {
            return;
          }
          store.setResponse(partId, {
            ...response(partId),
            steps: {
              ...(response(partId).steps ?? {}),
              [stepId]: { value: values ?? {}, lastCheck: own },
            },
          });
          setUi((state_) => ({ ...state_, newMarks: { [stepId]: true } }));
        } catch {
          /* The step answer remains saved. */
        }
      })();
    },
    [data, store, response, setUi],
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
        return state_ ? { state: state_ } : null;
      }
      return current?.lastCheck ?? null;
    },
    [store],
  );

  return { checkAufgabe, checkStep, resultFor };
}
