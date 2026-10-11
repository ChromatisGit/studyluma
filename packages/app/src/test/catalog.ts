import type {
  Catalog,
  Foliensatz,
  Placement,
  RichInline,
  RichNode,
  SourceEntry,
  Task,
  TaskPart,
} from "../modules/catalog";
import { typstToRow } from "../modules/worksheets";

/** Small builders for compiled-catalog objects in tests. */
export const inline = (value: string): RichInline[] => [
  { type: "text", value },
];
export const para = (value: string): RichNode[] => [
  { type: "paragraph", children: inline(value) },
];
export const gap = (
  id: string,
  exact: string,
  options: { choices?: string[]; math?: boolean } = {},
): RichInline => ({
  type: "gap",
  id,
  choices: options.choices ?? [],
  answer: {
    exact,
    ...(options.math ? { checkRow: typstToRow(exact) } : {}),
  },
});

export function part(
  id: string,
  type: TaskPart["type"],
  rest: Partial<TaskPart> = {},
): TaskPart {
  return { id, type, content: [], markers: {}, ...rest };
}
export function task(
  id: string,
  parts: TaskPart[],
  rest: Partial<Task> = {},
): Task {
  return {
    id,
    items: parts.map((p) => ({ type: "part" as const, part: p })),
    ...rest,
  };
}

export function entry(
  id: string,
  kind: SourceEntry["kind"],
  rest: Partial<SourceEntry> = {},
): SourceEntry {
  return { id, kind, segments: [], ...rest };
}

const base = (): Catalog => ({
  schemaVersion: 1,
  buildId: "b".repeat(64),
  timetable: { periods: [{ number: 1, start: 480, end: 525 }] },
  topics: [],
  courses: [],
  chapters: [],
  summaries: [],
  worksheets: [],
  challengePools: [],
  quizzes: [],
  foliensaetze: [],
  presentations: [],
  assets: [],
});

export function catalog(rest: Partial<Catalog> = {}): Catalog {
  return { ...base(), ...rest };
}

export const set = (
  id: string,
  title: string,
  entries: SourceEntry[],
  chapterId = "c1",
): Foliensatz => ({
  id,
  chapterId,
  filename: title,
  title,
  inOverview: true,
  entries,
});

export const placement = (
  id: string,
  sourceEntryId: string,
  path: string[],
  rest: Partial<Placement> = {},
): Placement => ({
  id,
  sourceEntryId,
  sourceFoliensatzId: path[0] ?? "",
  kind: "slide",
  inclusionPath: path,
  ...rest,
});
