import type { Catalog, Merkkarte } from "@studyluma/catalog-contract";

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
  CourseDefinition,
  EntryKind,
  Foliensatz,
  Graphic,
  Merkkarte,
  Placement,
  Presentation,
  Quiz,
  QuizQuestion,
  RichInline,
  RichNode,
  SlideSegment,
  SourceEntry,
  Steps,
  StructureLevel,
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
 * What a browser receives. Besides the redacted catalog it carries the
 * Merkkarten reachable through tips, which stay available while the
 * chapter's Inhalt is unreleased.
 */
export type PublicCatalog = Catalog & {
  tipCards: Record<string, Merkkarte & { chapterId: string }>;
};

/** What the reader has been given beyond the locked default. */
export type Releases = {
  summary(chapterId: string): boolean;
  solution(taskId: string): boolean;
};
