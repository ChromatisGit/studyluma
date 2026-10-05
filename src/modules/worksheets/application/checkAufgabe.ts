import { checkGaps, checkTask, type CheckMessages } from "../domain/check";
import type { ChapterState } from "../domain/chapterState";
import type { Part, PartResponse } from "../domain/contract";
import {
  helpLadder,
  isCheckable,
  recordCheck,
  structureLevel,
  type AufgabeInfo,
} from "../domain/structure";

export type AufgabeCheck = {
  /** New responses of the checked parts. */
  responses: Record<string, PartResponse>;
  /** Parts that got a mark now. */
  marked: string[];
  /** Parts whose first help step opens by itself. */
  openHelp: string[];
  /** Nothing was entered anywhere. */
  empty: boolean;
};

/** In the Rechenweg, the task's Prüfen also checks every step line. */
function checkSteps(
  part: Part,
  response: PartResponse,
  messages: CheckMessages,
) {
  let any = false;
  const steps = { ...(response.steps ?? {}) };
  for (const step of part.steps ?? []) {
    const values = steps[step.id]?.value as Record<string, unknown> | undefined;
    const own = step.gaps ? checkGaps(step.gaps, values, messages) : null;
    if (own) {
      steps[step.id] = { value: values ?? {}, lastCheck: own };
      any = true;
    }
  }
  return { response: { ...response, steps }, any };
}

/**
 * Prüfen for one Aufgabe: checks each part, counts changed wrong attempts
 * and opens the first help step after the second one.
 */
export function checkAufgabe(
  info: AufgabeInfo,
  state: ChapterState,
  helpShown: Record<string, number>,
  messages: CheckMessages,
): AufgabeCheck {
  const rechenweg = structureLevel(info, state, helpShown) === 2;
  const result: AufgabeCheck = {
    responses: {},
    marked: [],
    openHelp: [],
    empty: true,
  };
  for (const part of info.aufgabe.parts) {
    let next = state.responses[part.id] ?? { value: undefined, wrongChecks: 0 };
    if (rechenweg && part.steps) {
      const steps = checkSteps(part, next, messages);
      next = steps.response;
      result.empty &&= !steps.any;
    }
    const own = isCheckable(part)
      ? checkTask(part.task, next.value, messages)
      : null;
    if (own) {
      result.empty = false;
      next = recordCheck(next, own);
      result.marked.push(part.id);
      if (
        next.wrongChecks >= 2 &&
        helpLadder(part, info, state).length &&
        !helpShown[part.id]
      ) {
        result.openHelp.push(part.id);
      }
    }
    result.responses[part.id] = next;
  }
  return result;
}
