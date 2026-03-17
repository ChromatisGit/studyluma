/**
 * Typed event payloads for the ClassroomCoordinatorDO WebSocket stream.
 * Shared by server (DO, SSE routes) and client (hooks).
 */

import type { QuizResultsDTO, QuizStateDTO } from "./quizTypes";

// ── Stored in DO KV ─────────────────────────────────────────────────────────

export type LiveSlideState = {
  slideIndex: number;
  blackout: boolean;
  macroState: Record<string, string>;
  revealStep: number;
};

// ── Initial snapshots (sent on WebSocket open) ───────────────────────────────

export type AdminSnapshot = {
  type: "INIT";
  slideIndex: number;
  blackout: boolean;
  macroState: Record<string, string>;
  revealStep: number;
  /** null if no active quiz */
  quiz: QuizResultsDTO | null;
};

export type StudentSnapshot = {
  type: "INIT";
  /** null if no active quiz in enrolled course */
  quiz: QuizStateDTO | null;
  /** Server UTC timestamp at response time; used by clients to correct clock skew */
  serverNow: string;
};

// ── Live events (pushed to subscribers) ─────────────────────────────────────

export type SlideStateEvent = {
  type: "SLIDE_STATE";
  slideIndex: number;
  blackout: boolean;
  /** always full snapshot, never delta */
  macroState: Record<string, string>;
  revealStep: number;
};

/** Sent to admin subscribers after any quiz DB mutation; null when quiz closes */
export type QuizAdminEvent = {
  type: "QUIZ_STATE";
  quiz: QuizResultsDTO | null;
};

/** Sent to student subscribers when quiz phase changes; null when quiz closes */
export type QuizStudentEvent = {
  type: "QUIZ_STATE";
  quiz: QuizStateDTO | null;
};

/** Broadcast to enrolled students when a quiz first becomes active */
export type QuizStartedEvent = {
  type: "QUIZ_STARTED";
  courseId: string;
  sessionId: string;
};

export type PingEvent = {
  type: "PING";
};

// ── Admin stream: union of everything an admin subscriber can receive ─────────

export type AdminStreamEvent =
  | AdminSnapshot
  | SlideStateEvent
  | QuizAdminEvent
  | PingEvent;

// ── Student stream: union of everything a student subscriber can receive ──────

export type StudentStreamEvent =
  | StudentSnapshot
  | QuizStudentEvent
  | QuizStartedEvent
  | PingEvent;
