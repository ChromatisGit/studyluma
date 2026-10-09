import type { RichInline, RichNode } from "../../content-renderer";

/**
 * The compiled StudyLuma catalog (schema v1) as the Website reads it. The
 * Pipeline writes it; students receive the public form, in which answers,
 * correct options, unreleased solutions and teacher notes are absent.
 */
export type { RichInline, RichNode };

export type MathRowValue = unknown;
export type Answer = {
  exact?: string;
  checkRow?: MathRowValue;
  rounded?: string;
  decimals?: number;
  label?: string;
  /** A solution set `{1, 5}` or a vector `vec(1, 2)`; `elements` are its members. */
  kind?: "set" | "vector";
  elements?: Answer[];
};
export type StructureLevel = "none" | "plan" | "rechenweg";
export type TaskType =
  "Einsetzen" | "Auswahl" | "Antwort" | "Graph" | "Auftrag";
export type Steps = {
  /** `::schritte N`: the support visible from the start (0–3). */
  level: 0 | 1 | 2 | 3;
  kind: "plan" | "rechenweg";
  items: { id: string; content: RichInline[] }[];
};
export type TaskPart = {
  id: string;
  type: TaskType;
  title?: string;
  content: RichNode[];
  label?: string;
  /** The variable of a term answer, for the keypad (public). */
  variable?: string;
  /** What the answer field must look like: a solution set or a vector (public). */
  answerKind?: "set" | "vector";
  answer?: Answer;
  /** Graph: the expected functions, in input order (private). */
  answers?: Answer[];
  options?: { content: RichInline[]; correct?: boolean }[];
  multiple?: boolean;
  steps?: Steps;
  markers: {
    tipp?: RichNode[];
    loesung?: RichNode[];
    fehler?: { answer: string; feedback: string }[];
    textfeld?: boolean;
  };
};
export type Task = {
  id: string;
  title?: string;
  optional?: boolean;
  struktur?: { unterstuetzung: StructureLevel; uebung: StructureLevel };
  /** Challenges: ids of the worksheets that must be done first. */
  prerequisites?: string[];
  items: (
    { type: "content"; content: RichNode[] } | { type: "part"; part: TaskPart }
  )[];
};
export type WorksheetSection = {
  id: string;
  checkpoint: boolean;
  title: string;
  items: (
    { type: "content"; content: RichNode[] } | { type: "task"; task: Task }
  )[];
};
export type Worksheet = {
  id: string;
  chapterId: string;
  filename: string;
  title: string;
  intro?: string;
  chooseMode: boolean;
  nextWorksheetId?: string;
  sections: WorksheetSection[];
};
export type ChallengePool = {
  id: string;
  chapterId: string;
  challenges: Task[];
};
export type Merkkarte = {
  id: string;
  title: string;
  anchor: string;
  rule: RichNode[];
  examples: RichNode[][];
};
export type Summary = {
  id: string;
  chapterId: string;
  title: string;
  content: (
    { type: "content"; content: RichNode[] } | { type: "merkkarte"; id: string }
  )[];
  merkkarten: Merkkarte[];
};
export type QuizQuestion = {
  id: string;
  prompt: RichNode[];
  options: { content: RichInline[]; correct?: boolean }[];
  multiple: boolean;
};
export type Quiz = {
  id: string;
  chapterId: string;
  filename: string;
  title: string;
  questions: QuizQuestion[];
};
export type SlideSegment =
  | { type: "content"; content: RichNode[] }
  | {
      type: "columns";
      columns: { width: number; title?: string; content: RichNode[] }[];
    };
export type EntryKind =
  "slide" | "worksheet" | "quiz" | "merkkarte" | "summary" | "foliensatz";
export type SourceEntry = {
  id: string;
  kind: EntryKind;
  title?: string;
  reference?: string;
  referenceUrl?: string;
  targetId?: string;
  segments: SlideSegment[];
  /** Seconds since the start of the Foliensatz (`::bis`). */
  until?: number;
  /** Teacher only. */
  notes?: RichNode[];
};
export type Foliensatz = {
  id: string;
  chapterId: string;
  filename: string;
  title: string;
  inOverview: boolean;
  entries: SourceEntry[];
};
export type Placement = {
  id: string;
  sourceEntryId: string;
  sourceFoliensatzId: string;
  kind: Exclude<EntryKind, "foliensatz">;
  targetId?: string;
  title?: string;
  until?: number;
  inclusionPath: string[];
  /** Entries whose notes also belong to this placement. */
  noteSourceEntryIds?: string[];
};
export type Presentation = {
  id: string;
  rootFoliensatzId: string;
  chapterId: string;
  title: string;
  placements: Placement[];
};
export type Chapter = {
  id: string;
  group: string;
  topic: string;
  name: string;
  title: string;
  summaryId?: string;
  worksheetIds: string[];
  challengePoolId?: string;
  quizIds: string[];
  foliensatzIds: string[];
};
export type TopicIcon = { assetId: string } | { gallery: string };
export type Topic = {
  id: string;
  group: string;
  folder: string;
  title: string;
  icon?: TopicIcon;
};
export type CourseDefinition = {
  id: string;
  title: string;
  topics: { topicId: string; chapterIds: string[] }[];
};
export type Asset = {
  id: string;
  path: string;
  mimeType: string;
  sha256: string;
  byteLength: number;
};
export type Catalog = {
  schemaVersion: 1;
  buildId: string;
  timetable: { periods: { number: number; start: number; end: number }[] };
  topics: Topic[];
  courses: CourseDefinition[];
  chapters: Chapter[];
  summaries: Summary[];
  worksheets: Worksheet[];
  challengePools: ChallengePool[];
  quizzes: Quiz[];
  foliensaetze: Foliensatz[];
  presentations: Presentation[];
  assets: Asset[];
};
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
