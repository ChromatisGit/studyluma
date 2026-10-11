import { isBuildId } from "./meta";
import { CATALOG_FORMAT_VERSION } from "./version";

/** The catalog's top-level lists; all of them hold entities with an `id`. */
const LISTS = [
  "topics",
  "courses",
  "chapters",
  "summaries",
  "worksheets",
  "challengePools",
  "quizzes",
  "foliensaetze",
  "presentations",
  "assets",
] as const;

type Entities = Record<string, unknown>[];
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Structural problems of a parsed `catalog.json`: the top-level shape, unique
 * ids and the references between chapters, courses and their content. It
 * checks what the app relies on to find things, not every field of every
 * node. Empty when the catalog is usable.
 */
export function catalogShapeErrors(value: unknown): string[] {
  if (!isObject(value)) {
    return ["catalog.json must be a JSON object"];
  }
  const errors: string[] = [];
  if (value.schemaVersion !== CATALOG_FORMAT_VERSION) {
    errors.push(
      `catalog.json: unsupported schemaVersion ${String(value.schemaVersion)} (expected ${CATALOG_FORMAT_VERSION})`,
    );
  }
  if (!isBuildId(value.buildId)) {
    errors.push("catalog.json: buildId must be a SHA-256 hex digest");
  }
  const timetable = value.timetable;
  if (!isObject(timetable) || !Array.isArray(timetable.periods)) {
    errors.push("catalog.json: timetable.periods must be a list");
  }
  for (const list of LISTS) {
    if (!Array.isArray(value[list])) {
      errors.push(`catalog.json: ${list} must be a list`);
    }
  }
  if (errors.length) {
    return errors;
  }

  const ids = new Map<string, Set<string>>();
  for (const list of LISTS) {
    const seen = new Set<string>();
    ids.set(list, seen);
    for (const entity of value[list] as unknown[]) {
      const id = isObject(entity) ? entity.id : undefined;
      if (typeof id !== "string" || !id) {
        errors.push(`catalog.json: ${list} has an entry without an id`);
      } else if (seen.has(id)) {
        errors.push(`catalog.json: ${list} has the id ${id} twice`);
      }
      if (typeof id === "string") {
        seen.add(id);
      }
    }
  }
  if (errors.length) {
    return errors;
  }

  const known = (list: string, id: unknown) => ids.get(list)?.has(String(id));
  const reference = (from: string, list: string, id: unknown) => {
    if (!known(list, id)) {
      errors.push(
        `catalog.json: ${from} points to unknown ${list} ${String(id)}`,
      );
    }
  };
  for (const chapter of value.chapters as Entities) {
    const from = `chapter ${String(chapter.id)}`;
    const many = (field: string, list: string) => {
      const entries = chapter[field];
      if (!Array.isArray(entries)) {
        errors.push(`catalog.json: ${from} needs ${field}`);
        return;
      }
      entries.forEach((id) => reference(from, list, id));
    };
    many("worksheetIds", "worksheets");
    many("quizIds", "quizzes");
    many("foliensatzIds", "foliensaetze");
    if (chapter.summaryId !== undefined) {
      reference(from, "summaries", chapter.summaryId);
    }
    if (chapter.challengePoolId !== undefined) {
      reference(from, "challengePools", chapter.challengePoolId);
    }
  }
  for (const course of value.courses as Entities) {
    const from = `course ${String(course.id)}`;
    if (!Array.isArray(course.topics)) {
      errors.push(`catalog.json: ${from} needs topics`);
      continue;
    }
    for (const entry of course.topics as Entities) {
      reference(from, "topics", entry.topicId);
      const chapterIds = Array.isArray(entry.chapterIds)
        ? entry.chapterIds
        : [];
      chapterIds.forEach((id) => reference(from, "chapters", id));
    }
  }
  for (const presentation of value.presentations as Entities) {
    reference(
      `presentation ${String(presentation.id)}`,
      "foliensaetze",
      presentation.rootFoliensatzId,
    );
  }
  return errors;
}
