/**
 * Shared types for the live quiz feature.
 * Used by both server (service/actions) and client (UI components).
 */

export type QuizPhase =
  | "waiting"        // waiting for students to join
  | "active"         // question is live, students can submit
  | "reveal_dist"    // teacher reveals distribution (no correct highlighted)
  | "reveal_correct" // correct answer shown
  | "summary"        // end-of-quiz reflection; teacher dismisses to close
  | "closed";        // session archived

/** A quiz question as stored in quiz_sessions.questions JSONB */
export type StoredQuestion = {
  question: string;         // markdown string
  options: string[];        // markdown strings
  correctIndices: number[]; // indices into options that are correct
  why?: string;             // optional markdown explanation
};

/**
 * Active quiz state sent to students via the polling API.
 * Fields are selectively populated per phase — see comments.
 */
export type QuizStateDTO = {
  sessionId: string;
  courseId: string;
  phase: Exclude<QuizPhase, "closed">;
  currentIndex: number;
  totalQuestions: number;
  question: string;
  options: string[];
  /** Present during reveal_correct and summary */
  correctIndices?: number[];
  /** Present during waiting, reveal_dist, reveal_correct, summary */
  participants?: number;
  /** Present during reveal_dist, reveal_correct */
  optionCounts?: number[];
  /** Present during reveal_dist, reveal_correct */
  answeredCount?: number;
  /** Present only during summary phase */
  questionSummaries?: QuizQuestionSummary[];
  updatedAt: string;
};

/**
 * Result data sent to presenter + projector via the admin polling API.
 * Includes aggregate counts (no individual user data exposed to UI).
 */
export type QuizResultsDTO = {
  sessionId: string;
  courseId: string;
  phase: QuizPhase;
  currentIndex: number;
  totalQuestions: number;
  question: string;
  options: string[];
  correctIndices: number[];
  /** Number of students who have joined the session */
  participants: number;
  /** Number of responses submitted for the current question */
  answeredCount: number;
  /** Per-option submission count for the current question */
  optionCounts: number[];
  /** Present only during summary phase */
  questionSummaries?: QuizQuestionSummary[];
  updatedAt: string;
};

/**
 * Per-question summary after session closes or during summary phase.
 */
export type QuizQuestionSummary = {
  questionIndex: number;
  question: string;
  options: string[];
  correctIndices: number[];
  participants: number;
  optionCounts: number[];
  /** Percentage of participants who selected all correct options (0–100) */
  percentCorrect: number;
};

export type QuizSummaryDTO = {
  sessionId: string;
  courseId: string;
  createdAt: string;
  questions: QuizQuestionSummary[];
};
