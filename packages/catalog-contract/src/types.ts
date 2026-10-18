import type { MathRow } from "./mathNodes";
import type { CATALOG_FORMAT_VERSION } from "./version";

/**
 * The compiled StudyLuma catalog as the compiler writes it and the app reads
 * it (`catalog.json`). Students receive the public form, in which answers,
 * correct options, unreleased solutions and teacher notes are absent; those
 * fields are therefore optional here and marked private.
 */

/** A position in the author's source; compiler diagnostics and slide origins use it. */
export type Location = { file: string; line: number; column: number };

/** A compiled Grafik file (`::grafik`); curves are rows evaluated in x and the parameters. */
export type Graphic = {
  axes: {
    x: [number, number];
    y: [number, number];
    /**
     * Grid and labels of the x axis in multiples of π (`x-raster`); absent for
     * a numeric axis. Older artifacts lack it and draw a numeric axis.
     */
    xGrid?: "pi" | "pi/2" | "pi/4";
  };
  graphs: { source: string; row: MathRow; name?: string }[];
  points: { position: [number, number]; name?: string }[];
  parameters: {
    name: string;
    from: number;
    to: number;
    step: number;
    start: number;
    /** `"pi"`: the value is shown as a multiple of π (it stays a number). */
    unit?: "pi";
  }[];
  /** Makes the Grafik the workspace of a Graph task. */
  input?: { type: "function"; count: number };
};

export type RichInline =
  | { type: "text" | "code"; value: string }
  | { type: "strong" | "emphasis" | "highlight"; children: RichInline[] }
  | { type: "math"; source: string; display: string }
  | { type: "link"; url: string; children: RichInline[] }
  | { type: "image"; assetId: string; alt: string; fit: "contain" | "cover" }
  | {
      type: "gap";
      id: string;
      choices: string[];
      /** Public form only: what the field looks like once the answer is gone. */
      inputKind?: "dropdown" | "math" | "text";
      /** Private. */
      answer?: Answer;
    }
  | { type: "merkkarteRef"; targetId: string; title: string };

/** A formula as written and as rendered MathML. */
export type MathPart = { source: string; display: string };

/** One line of a transformation: the equation and what is done to both sides. */
export type DerivationStep = { equation: MathPart; operation?: MathPart };

export type RichNode =
  | { type: "paragraph" | "heading"; children: RichInline[]; depth?: number }
  | { type: "list"; ordered: boolean; items: RichNode[][] }
  | { type: "table"; rows: RichInline[][][] }
  | { type: "code"; value: string; language?: string }
  | { type: "math"; source: string; display: string }
  /** Formula lines of which some end in `| operation`; the operations align. */
  | { type: "derivation"; steps: DerivationStep[] }
  /** `::platz N`: N blocks of free space between two parts of a slide. */
  | { type: "space"; size: number }
  /** `::merkkarte`: a Merkkarte placed inside a slide's text. */
  | { type: "merkkarteCard"; targetId: string }
  | { type: "graphic"; title: string; graphic: Graphic };

export type Answer = {
  exact?: string;
  checkRow?: MathRow;
  rounded?: string;
  decimals?: number;
  label?: string;
  /** A solution set `{1; 5}` or a vector `vec(1; 2)`; `elements` are its members. */
  kind?: "set" | "vector";
  elements?: Answer[];
};
export type TaskType =
  "Einsetzen" | "Auswahl" | "Antwort" | "Graph" | "Auftrag";
export type Steps = {
  /** `::schritte`: the way to the answer, one step at a time. Every step has a gap. */
  items: { id: string; content: RichInline[] }[];
};
export type TaskPart = {
  id: string;
  type: TaskType;
  title?: string;
  content: RichNode[];
  label?: string;
  /** The variable of a term answer, for the keypad (public form only). */
  variable?: string;
  /** What the answer field must look like: a solution set or a vector (public form only). */
  answerKind?: "set" | "vector";
  /** Private. */
  answer?: Answer;
  /** Graph: the expected functions, in input order (private). */
  answers?: Answer[];
  /** `correct` is private. */
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
  /** Only named tasks (`## Antwort: "Title"`) and groups have a title. */
  title?: string;
  optional?: boolean;
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
  /** URL name: the file name without its number prefix; unique within the chapter. */
  slug: string;
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
    | { type: "content"; content: RichNode[] }
    | { type: "merkkarte"; id: string }
    /** An example outside a Merkkarte (`::beispiel`), shown on demand. */
    | { type: "example"; content: RichNode[] }
  )[];
  merkkarten: Merkkarte[];
};
export type QuizQuestion = {
  id: string;
  prompt: RichNode[];
  /** `correct` is private. */
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
/** `::tag`: the tab of a slide. `erklaeren` and `aufgabe` carry a function; the rest are presets. */
export type SlideTone =
  "erklaeren" | "aufgabe" | "neutral" | "hinweis" | "wichtig" | "merke";
export type SlideTag = { label: string; tone: SlideTone };
export type EntryKind =
  "slide" | "worksheet" | "quiz" | "merkkarte" | "summary" | "foliensatz";
export type SourceEntry = {
  id: string;
  kind: EntryKind;
  title?: string;
  /** Quoted Merkkarte name, or file name, or link text. */
  reference?: string;
  /** Relative Markdown link of a cross-chapter Merkkarte or Foliensatz reference. */
  referenceUrl?: string;
  targetId?: string;
  segments: SlideSegment[];
  /** The tab of a slide (`::tag`). */
  tag?: SlideTag;
  /** Seconds since the start of the Foliensatz (`::bis`). */
  until?: number;
  /** Teacher only. */
  notes?: RichNode[];
  /** Where the entry was written; the compiler always sets it. */
  location?: Location;
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
  /** URL name: the folder name without its number prefix; unique within each course. */
  slug: string;
  /** First folder level: a free shelf, carries no meaning. */
  group: string;
  /** Topic folder name. */
  topic: string;
  /** Chapter folder name. */
  name: string;
  /** Front matter titel of inhalt.md, else the folder name. */
  title: string;
  summaryId?: string;
  worksheetIds: string[];
  challengePoolId?: string;
  quizIds: string[];
  foliensatzIds: string[];
};
/** `icon.svg` as an asset, or an id from the app's pictogram gallery. */
export type TopicIcon = { assetId: string } | { gallery: string };
export type Topic = {
  id: string;
  group: string;
  folder: string;
  /** thema.toml titel. */
  title: string;
  icon?: TopicIcon;
};
export type CourseDefinition = {
  id: string;
  title: string;
  topics: { topicId: string; chapterIds: string[] }[];
  /** The chapter the course is at (`aktuell`); the first chapter when absent. */
  currentChapterId?: string;
};
/** Bell times in minutes after midnight. */
export type Timetable = {
  periods: { number: number; start: number; end: number }[];
};
export type Asset = {
  id: string;
  path: string;
  mimeType: string;
  sha256: string;
  byteLength: number;
};
export type Catalog = {
  schemaVersion: typeof CATALOG_FORMAT_VERSION;
  buildId: string;
  timetable: Timetable;
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
