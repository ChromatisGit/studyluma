import type { Node, Markdown } from "./page";

export type Slide = {
  header: string;
  content: Node[];
  presenterNotes: Markdown[];
};

export type SlideDeck = {
  title: string;
  slides: Slide[];
};


// ─── Typed Slide Deck (new slide format using slides-style-new.typ) ────────────

export type SlideContentItem =
  | { type: "text"; content: string }
  | { type: "formula"; expr: string }
  | { type: "image"; file: string; label?: string }
  | { type: "link"; url: string; label?: string }
  | { type: "codeRunner"; code: string; language: string };

type BaseSlide = {
  header: string;
  presenterNotes?: string;
  reveal?: "auto" | "manual";
};

export type SectionSlide = BaseSlide & {
  slideType: "sectionSlide";
  subtitle?: string;
};

export type HookSlide = BaseSlide & {
  slideType: "hookSlide";
  focus?: string;
  bullets?: string[];
  inlineMaterial?: SlideContentItem;
  material?: SlideContentItem;
};

export type ConceptSlide = BaseSlide & {
  slideType: "conceptSlide";
  focus?: string;
  bullets?: string[];
  inlineMaterial?: SlideContentItem;
  material?: SlideContentItem;
};

export type CompareColumn = { title: string; body: string };

export type CompareSlide = BaseSlide & {
  slideType: "compareSlide";
  focus?: string;
  columns: CompareColumn[];
  result?: string;
};

export type ExampleSlide = BaseSlide & {
  slideType: "exampleSlide";
  bullets?: string[];
  result?: SlideContentItem;
  inlineMaterial?: SlideContentItem;
  material?: SlideContentItem;
};

export type PromptSlide = BaseSlide & {
  slideType: "promptSlide";
  focus?: string;
  bullets?: string[];
  result?: SlideContentItem;
  inlineMaterial?: SlideContentItem;
  material?: SlideContentItem;
};

export type TaskSlide = BaseSlide & {
  slideType: "taskSlide";
  focus?: string;
  bullets?: string[];
  result?: string;
  inlineMaterial?: SlideContentItem;
  material?: SlideContentItem;
};

export type RecapSlide = BaseSlide & {
  slideType: "recapSlide";
  bullets: string[];
};

export type QuizQuestion = {
  question: string;
  options: { text: string; correct: boolean }[];
};

export type QuizSlide = BaseSlide & {
  slideType: "quizSlide";
  questions: QuizQuestion[];
};

export type TypedSlide =
  | SectionSlide
  | HookSlide
  | ConceptSlide
  | CompareSlide
  | ExampleSlide
  | PromptSlide
  | TaskSlide
  | RecapSlide
  | QuizSlide;

export type TypedSlideDeck = {
  title: string;
  content: TypedSlide[];
};

export type SlideState = {
  slideIndex: number;
  blackout: boolean;
  interactiveState: Record<string, string>;
  pointer?: { x: number; y: number; visible: boolean };
};

export type SlideMessage =
  | { type: "SLIDE_CHANGE"; slideIndex: number }
  | { type: "STATE_UPDATE"; state: SlideState }
  | { type: "BLACKOUT"; blackout: boolean }
  | { type: "SYNC_REQUEST" }
  | { type: "SYNC_RESPONSE"; state: SlideState }
  | { type: "FULLSCREEN_REQUEST" };
