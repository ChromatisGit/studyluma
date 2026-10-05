import type { Part, PartResponse } from "../domain/contract";
import { isMathRow, type MathRow } from "../domain/mathNodes";
import type { SetValue } from "../domain/check";

/** Which input a math field edits. */
export type FieldRef = {
  key: string;
  partId: string;
  stepId?: string | undefined;
  gapId?: string | undefined;
};

export const fieldKey = (partId: string, stepId?: string, gapId?: string) =>
  `f:${partId}@${stepId ?? ""}@${gapId ?? ""}`;

export const fieldRef = (
  partId: string,
  stepId?: string,
  gapId?: string,
): FieldRef => ({
  key: fieldKey(partId, stepId, gapId),
  partId,
  stepId,
  gapId,
});

export const emptyResponse = (): PartResponse => ({
  value: undefined,
  wrongChecks: 0,
});

export const isSetAnswer = (part: Part, ref: FieldRef) =>
  !ref.gapId &&
  !ref.stepId &&
  part.task.type === "ergebnis" &&
  part.task.answer.kind === "set";

export function readSet(value: unknown): SetValue {
  const set = value as Partial<SetValue> | undefined;
  return {
    row: isMathRow(set?.row) ? set.row : [],
    ...(set?.none ? { none: true } : {}),
  };
}

/** The row a math field shows. */
export function readField(
  part: Part,
  response: PartResponse | undefined,
  ref: FieldRef,
): MathRow {
  if (ref.stepId) {
    const value = response?.steps?.[ref.stepId]?.value as
      Record<string, unknown> | undefined;
    const row = ref.gapId ? value?.[ref.gapId] : undefined;
    return isMathRow(row) ? row : [];
  }
  if (ref.gapId) {
    const row = (response?.value as Record<string, unknown> | undefined)?.[
      ref.gapId
    ];
    return isMathRow(row) ? row : [];
  }
  if (isSetAnswer(part, ref)) {
    return readSet(response?.value).row;
  }
  return isMathRow(response?.value) ? response.value : [];
}

/**
 * A new response with one input changed. Changing an answer clears its
 * mark until the next check (a step keeps its own mark).
 */
export function writeInput(
  part: Part,
  response: PartResponse | undefined,
  ref: Omit<FieldRef, "key">,
  value: unknown,
): PartResponse {
  const current = response ?? emptyResponse();
  if (ref.stepId) {
    const steps = { ...(current.steps ?? {}) };
    const step = steps[ref.stepId];
    const values = {
      ...((step?.value as Record<string, unknown> | undefined) ?? {}),
    };
    if (ref.gapId) {
      values[ref.gapId] = value;
    }
    steps[ref.stepId] = { value: values };
    return { ...current, steps };
  }
  const { lastCheck: _cleared, ...rest } = current;
  if (ref.gapId) {
    const values = {
      ...((current.value as Record<string, unknown> | undefined) ?? {}),
    };
    values[ref.gapId] = value;
    return { ...rest, value: values };
  }
  if (isSetAnswer(part, { key: "", ...ref })) {
    return {
      ...rest,
      value: { ...readSet(current.value), row: value as MathRow },
    };
  }
  return { ...rest, value };
}
