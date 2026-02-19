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
