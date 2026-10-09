import type { SummaryRule } from "../../catalog";

/**
 * The Inhalte that open when the class moves from one chapter to another.
 * "kapitel" opens a chapter's Inhalt as the class reaches it, "abschluss"
 * once the class has left it; "manuell" never opens by itself. Only moving
 * forward opens anything.
 */
export function summariesToRelease(input: {
  /** Chapter ids in course order. */
  order: string[];
  from: string | null;
  to: string | null;
  rule: (chapterId: string) => SummaryRule;
  /** Has an Inhalt that is not yet released. */
  closed: (chapterId: string) => boolean;
}): string[] {
  const from = input.order.indexOf(input.from ?? "");
  const to = input.order.indexOf(input.to ?? "");
  if (to < 0 || to <= from) {
    return [];
  }
  return input.order.filter((id, index) => {
    if (!input.closed(id)) {
      return false;
    }
    const rule = input.rule(id);
    return (
      (rule === "abschluss" && index >= from && index < to) ||
      (rule === "kapitel" && index > from && index <= to)
    );
  });
}
