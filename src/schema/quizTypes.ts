/**
 * Shared types for the live quiz feature.
 * Used by both server (service/actions) and client (UI components).
 */

export type QuizPhase =
  | "waiting"        // waiting for students to join
  | "active"         // question is live, students can submit
  | "reveal_dist"    // timer ended / all answered; distribution shown (no correct highlighted)
  | "reveal_correct" // correct answer + #why shown
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
 * Only fields safe to reveal to students at each phase.
 */
export type QuizStateDTO = {
  sessionId: string;
  phase: Exclude<QuizPhase, "closed">;
  currentIndex: number;
  totalQuestions: number;
  question: string;   // markdown
  options: string[];  // markdown array
  /** Only present in reveal_correct phase */
  correctIndices?: number[];
  /** Only present in reveal_correct phase */
  why?: string;
  /** Seconds per question, null = no timer */
  timerSeconds: number | null;
  /** ISO timestamp when the timer started for the current question */
  timerStartedAt: string | null;
  updatedAt: string;
};

/**
 * Result data sent to presenter + projector via the admin polling API.
 * Includes aggregate counts (no individual user data exposed to UI).
 */
export type QuizResultsDTO = {
  sessionId: string;
  phase: QuizPhase;
  currentIndex: number;
  totalQuestions: number;
  question: string;
  options: string[];
  correctIndices: number[];
  why?: string;
  /** Number of students who have joined the session */
  participants: number;
  /** Number of responses submitted for the current question */
  answeredCount: number;
  /** Per-option submission count for the current question */
  optionCounts: number[];
  timerSeconds: number | null;
  timerStartedAt: string | null;
  updatedAt: string;
};

/**
 * Per-question summary after session is closed.
 * Shown in the teacher's post-session review.
 */
export type QuizQuestionSummary = {
  questionIndex: number;
  question: string;
  options: string[];
  correctIndices: number[];
  why?: string;
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
