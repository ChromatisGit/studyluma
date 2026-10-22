import type {
  Catalog,
  Merkkarte,
  Timetable,
} from "@studyluma/catalog-contract";

/**
 * The compiled catalog types are defined by `@studyluma/catalog-contract`;
 * the app re-exports them for its modules and adds what only the app knows.
 */
export type {
  Answer,
  Asset,
  Catalog,
  ChallengePool,
  Chapter,
  ComponentUse,
  CourseDefinition,
  EntryKind,
  Foliensatz,
  Graphic,
  JsonValue,
  Merkkarte,
  Placement,
  Presentation,
  Quiz,
  QuizQuestion,
  RichInline,
  RichNode,
  SlideSegment,
  SlideTag,
  SourceEntry,
  Steps,
  Summary,
  Task,
  TaskPart,
  TaskType,
  Timetable,
  Topic,
  TopicIcon,
  Worksheet,
  WorksheetSection,
} from "@studyluma/catalog-contract";

/**
 * When a chapter's Inhalt opens for the class by itself: with the chapter
 * (once the class reaches it), after the chapter (once the class moves on),
 * or only when the teacher releases it.
 */
export type SummaryRule = "kapitel" | "abschluss" | "manuell";

/**
 * What a browser receives for the chapters a page shows: the catalog
 * redacted for the reader and cut down to those chapters (the small shared
 * parts, such as chapters and topics, stay whole). Besides that it carries
 * the Merkkarten reachable through the tips of its tasks, which stay
 * available while their chapter's Inhalt is unreleased.
 */
export type PublicCatalog = Catalog & {
  tipCards: Record<string, Merkkarte & { chapterId: string }>;
};

/**
 * What every page knows about the whole catalog without its content: the
 * same for every reader, because none of it is secret.
 */
export type CatalogIndex = {
  buildId: string;
  timetable: Timetable;
  /** The title of each chapter's Inhalt, for chapters that have one. */
  summaryTitles: Record<string, string>;
  /** Where each Merkkarte lives, for links into the chapter's Inhalt. */
  merkkarten: Array<{ id: string; anchor: string; chapterId: string }>;
  /** Each chapter's worksheets in order. */
  worksheets: Record<string, Array<{ id: string; slug: string }>>;
};

/** What the reader has been given beyond the locked default. */
export type Releases = {
  summary(chapterId: string): boolean;
  solution(taskId: string): boolean;
};
