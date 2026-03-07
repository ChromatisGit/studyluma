import "server-only";

import { anonSQL, userSQL } from "@db/runSQL";
import type { UserDTO } from "@services/userService";
import type {
  QuizPhase,
  QuizStateDTO,
  QuizResultsDTO,
  QuizSummaryDTO,
  QuizQuestionSummary,
  StoredQuestion,
} from "@schema/quizTypes";

// ==========================================================================
// Row types (DB → TypeScript)
// ==========================================================================

type QuizSessionRow = {
  session_id: string;
  channel_name: string;
  course_id: string;
  phase: QuizPhase;
  questions: StoredQuestion[];
  current_index: number;
  timer_seconds: number | null;
  timer_started_at: string | null;
  updated_at: string;
  created_at: string;
};

// ==========================================================================
// Helpers
// ==========================================================================

function buildStateDTO(row: QuizSessionRow): QuizStateDTO {
  const q = row.questions[row.current_index];
  const phase = row.phase as Exclude<QuizPhase, "closed">;

  return {
    sessionId: row.session_id,
    phase,
    currentIndex: row.current_index,
    totalQuestions: row.questions.length,
    question: q.question,
    options: q.options,
    ...(phase === "reveal_correct" && {
      correctIndices: q.correctIndices,
      why: q.why,
    }),
    timerSeconds: row.timer_seconds,
    timerStartedAt: row.timer_started_at,
    updatedAt: row.updated_at,
  };
}

// ==========================================================================
// Admin: session lifecycle
// ==========================================================================

/**
 * Create a new quiz session. Fails if an active session already exists for
 * this course (enforced by the partial unique index).
 */
export async function startQuizSession(
  channelName: string,
  courseId: string,
  questions: StoredQuestion[],
  timerSeconds: number | null,
  user: UserDTO,
): Promise<string> {
  const sessionId = crypto.randomUUID();

  await userSQL(user)`
    INSERT INTO quiz_sessions
      (session_id, channel_name, course_id, questions, timer_seconds)
    VALUES
      (${sessionId}, ${channelName}, ${courseId}, ${questions as never}, ${timerSeconds})
  `;

  return sessionId;
}

/** waiting → active; starts the timer timestamp */
export async function launchQuizQuestion(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase            = 'active',
        timer_started_at = now(),
        updated_at       = now()
    WHERE session_id = ${sessionId}
      AND phase = 'waiting'
  `;
}

/** active → reveal_dist (distribution shown, no correct highlighted yet) */
export async function revealDistribution(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase      = 'reveal_dist',
        updated_at = now()
    WHERE session_id = ${sessionId}
      AND phase IN ('active', 'waiting')
  `;
}

/** reveal_dist → reveal_correct (correct answer + #why shown) */
export async function revealCorrectAnswer(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase      = 'reveal_correct',
        updated_at = now()
    WHERE session_id = ${sessionId}
      AND phase = 'reveal_dist'
  `;
}

/** reveal_correct → waiting for next question; increments current_index */
export async function nextQuizQuestion(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase            = 'waiting',
        current_index    = current_index + 1,
        timer_started_at = NULL,
        updated_at       = now()
    WHERE session_id = ${sessionId}
      AND phase = 'reveal_correct'
  `;
}

/**
 * Skip the current question (any non-closed phase).
 * Marks the session as skipped by moving to next question in 'waiting' phase.
 * If already on the last question, closes the session instead.
 */
export async function skipQuestion(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  const [row] = await userSQL(user)<Pick<QuizSessionRow, "current_index" | "questions">[]>`
    SELECT current_index, questions
    FROM quiz_sessions
    WHERE session_id = ${sessionId}
      AND phase != 'closed'
  `;
  if (!row) return;

  const isLast = row.current_index >= (row.questions as StoredQuestion[]).length - 1;

  if (isLast) {
    await userSQL(user)`
      UPDATE quiz_sessions
      SET phase      = 'closed',
          updated_at = now()
      WHERE session_id = ${sessionId}
    `;
  } else {
    await userSQL(user)`
      UPDATE quiz_sessions
      SET phase            = 'waiting',
          current_index    = current_index + 1,
          timer_started_at = NULL,
          updated_at       = now()
      WHERE session_id = ${sessionId}
    `;
  }
}

/** Closes the session (after last question's reveal_correct phase) */
export async function closeQuizSession(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase      = 'closed',
        updated_at = now()
    WHERE session_id = ${sessionId}
  `;
}

// ==========================================================================
// Student: join + submit
// ==========================================================================

/** Register a student as a participant. Idempotent (INSERT ... ON CONFLICT). */
export async function joinQuizSession(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    INSERT INTO quiz_participants (session_id, user_id)
    VALUES (${sessionId}, ${user.id})
    ON CONFLICT DO NOTHING
  `;
}

/**
 * Store a student's answer for the current question.
 * After inserting, calls try_advance_quiz_phase() to auto-advance if everyone
 * has answered. Returns false if the session is no longer in 'active' phase.
 */
export async function submitQuizResponse(
  sessionId: string,
  questionIndex: number,
  selected: number[],
  timedOut: boolean,
  user: UserDTO,
): Promise<{ ok: boolean; reason?: string }> {
  // Verify session is still active for this question
  const [session] = await userSQL(user)<Pick<QuizSessionRow, "phase" | "current_index">[]>`
    SELECT phase, current_index
    FROM quiz_sessions
    WHERE session_id = ${sessionId}
  `;

  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.phase !== "active") return { ok: false, reason: "phase_ended" };
  if (session.current_index !== questionIndex) return { ok: false, reason: "wrong_question" };

  await userSQL(user)`
    INSERT INTO quiz_responses (session_id, user_id, question_index, selected, timed_out)
    VALUES (${sessionId}, ${user.id}, ${questionIndex}, ${selected as never}, ${timedOut})
    ON CONFLICT DO NOTHING
  `;

  // Trigger auto-advance check via SECURITY DEFINER function
  // (bypasses RLS — student can trigger phase transition)
  await anonSQL`SELECT try_advance_quiz_phase(${sessionId}, ${questionIndex})`;

  return { ok: true };
}

// ==========================================================================
// Student: poll for current quiz state
// ==========================================================================

/**
 * Returns the active quiz state for a course.
 * Only returns sessions in non-closed phases (RLS enforces enrollment check).
 */
export async function getActiveQuizForCourse(
  courseId: string,
  user: UserDTO,
): Promise<QuizStateDTO | null> {
  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, channel_name, course_id, phase, questions,
           current_index, timer_seconds, timer_started_at, updated_at, created_at
    FROM quiz_sessions
    WHERE course_id = ${courseId}
      AND phase != 'closed'
    LIMIT 1
  `;

  return row ? buildStateDTO(row) : null;
}

/**
 * Returns the active quiz for any course the user is enrolled in.
 * Since only one quiz runs at a time, this is effectively the global active quiz.
 */
export async function getActiveQuizForUser(user: UserDTO): Promise<QuizStateDTO | null> {
  if (!user.courseIds.length) return null;

  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, channel_name, course_id, phase, questions,
           current_index, timer_seconds, timer_started_at, updated_at, created_at
    FROM quiz_sessions
    WHERE course_id = ANY(${user.courseIds as string[]})
      AND phase != 'closed'
    LIMIT 1
  `;

  return row ? buildStateDTO(row) : null;
}

// ==========================================================================
// Admin: live results polling
// ==========================================================================

/**
 * Returns aggregate results for the current question of a session.
 * Admin only — called by the presenter + projector polling endpoint.
 */
export async function getQuizResults(
  sessionId: string,
  user: UserDTO,
): Promise<QuizResultsDTO | null> {
  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, channel_name, course_id, phase, questions,
           current_index, timer_seconds, timer_started_at, updated_at, created_at
    FROM quiz_sessions
    WHERE session_id = ${sessionId}
  `;

  if (!row) return null;

  const q = row.questions[row.current_index];

  const [participantRow, responseRows] = await Promise.all([
    userSQL(user)<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM quiz_participants
      WHERE session_id = ${sessionId}
    `,
    userSQL(user)<{ selected: number[] }[]>`
      SELECT selected
      FROM quiz_responses
      WHERE session_id = ${sessionId}
        AND question_index = ${row.current_index}
    `,
  ]);

  const participants = participantRow[0]?.count ?? 0;
  const optionCounts = new Array<number>(q.options.length).fill(0);
  for (const r of responseRows) {
    for (const idx of r.selected) {
      if (idx >= 0 && idx < optionCounts.length) {
        optionCounts[idx]++;
      }
    }
  }

  return {
    sessionId: row.session_id,
    phase: row.phase,
    currentIndex: row.current_index,
    totalQuestions: row.questions.length,
    question: q.question,
    options: q.options,
    correctIndices: q.correctIndices,
    why: q.why,
    participants,
    answeredCount: responseRows.length,
    optionCounts,
    timerSeconds: row.timer_seconds,
    timerStartedAt: row.timer_started_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Returns results for the active session on a given channelName.
 * Used by the projector, which knows channelName but not sessionId.
 */
export async function getQuizResultsByChannel(
  channelName: string,
  user: UserDTO,
): Promise<QuizResultsDTO | null> {
  const [row] = await userSQL(user)<{ session_id: string }[]>`
    SELECT session_id
    FROM quiz_sessions
    WHERE channel_name = ${channelName}
      AND phase != 'closed'
    LIMIT 1
  `;
  if (!row) return null;
  return getQuizResults(row.session_id, user);
}

// ==========================================================================
// Admin: post-session summary
// ==========================================================================

/**
 * Returns per-question statistics after a session is closed.
 * Used by the teacher review screen.
 */
export async function getQuizSummary(
  sessionId: string,
  user: UserDTO,
): Promise<QuizSummaryDTO | null> {
  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, course_id, phase, questions, current_index, created_at
    FROM quiz_sessions
    WHERE session_id = ${sessionId}
  `;

  if (!row) return null;

  const questions = row.questions as StoredQuestion[];

  const responseRows = await userSQL(user)<{ question_index: number; selected: number[] }[]>`
    SELECT question_index, selected
    FROM quiz_responses
    WHERE session_id = ${sessionId}
  `;

  const participantCount = await userSQL(user)<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM quiz_participants
    WHERE session_id = ${sessionId}
  `;
  const participants = participantCount[0]?.count ?? 0;

  // Group responses by question
  const byQuestion = new Map<number, number[][]>();
  for (const r of responseRows) {
    const list = byQuestion.get(r.question_index) ?? [];
    list.push(r.selected);
    byQuestion.set(r.question_index, list);
  }

  const summaryQuestions: QuizQuestionSummary[] = questions.map((q, i) => {
    const responses = byQuestion.get(i) ?? [];
    const optionCounts = new Array<number>(q.options.length).fill(0);
    let correctCount = 0;

    for (const selected of responses) {
      for (const idx of selected) {
        if (idx >= 0 && idx < optionCounts.length) {
          optionCounts[idx]++;
        }
      }
      // Count as correct if all selected indices are in correctIndices and lengths match
      const isCorrect =
        selected.length === q.correctIndices.length &&
        selected.every((s) => q.correctIndices.includes(s));
      if (isCorrect) correctCount++;
    }

    return {
      questionIndex: i,
      question: q.question,
      options: q.options,
      correctIndices: q.correctIndices,
      why: q.why,
      participants,
      optionCounts,
      percentCorrect: participants > 0 ? Math.round((correctCount / participants) * 100) : 0,
    };
  });

  return {
    sessionId: row.session_id,
    courseId: row.course_id,
    createdAt: row.created_at,
    questions: summaryQuestions,
  };
}

// ==========================================================================
// Admin: list recent sessions (for review screen)
// ==========================================================================

export type QuizSessionMeta = {
  sessionId: string;
  courseId: string;
  phase: QuizPhase;
  totalQuestions: number;
  createdAt: string;
};

export async function listQuizSessions(
  courseId: string,
  user: UserDTO,
): Promise<QuizSessionMeta[]> {
  const rows = await userSQL(user)<{
    session_id: string;
    course_id: string;
    phase: QuizPhase;
    questions: StoredQuestion[];
    created_at: string;
  }[]>`
    SELECT session_id, course_id, phase, questions, created_at
    FROM quiz_sessions
    WHERE course_id = ${courseId}
    ORDER BY created_at DESC
    LIMIT 20
  `;

  return rows.map((r) => ({
    sessionId: r.session_id,
    courseId: r.course_id,
    phase: r.phase,
    totalQuestions: (r.questions as StoredQuestion[]).length,
    createdAt: r.created_at,
  }));
}
