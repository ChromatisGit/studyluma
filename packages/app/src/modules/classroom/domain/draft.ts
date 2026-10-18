/** Whether two selections hold the same options, in any order. */
export function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * What a student ticked but never handed in: "never" when nothing was
 * submitted for the question at all, "changed" when the ticks differ from the
 * submitted answer (which is the one that counts); null when nothing is lost.
 */
export function unsentChoice(
  submitted: string[] | null,
  draft: string[] | null,
): "never" | "changed" | null {
  if (draft === null || draft.length === 0) {
    return null;
  }
  if (submitted === null) {
    return "never";
  }
  return sameSet(submitted, draft) ? null : "changed";
}
