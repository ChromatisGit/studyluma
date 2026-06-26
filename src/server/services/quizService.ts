import { sqlParam, userSQL } from "@core/db.server";
import type { UserDTO } from "@services/userService";
import type {
  QuizPhase,
  QuizStateDTO,
  StoredQuestion,
} from "@schema/quizTypes";

// ==========================================================================
// Row types (DB → TypeScript)
// ==========================================================================

type QuizSessionRow = {
  session_id: string;
  course_id: string;
  phase: QuizPhase;
  questions: StoredQuestion[];
  current_index: number;
  updated_at: string;
  created_at: string;
};

// ==========================================================================
// Helpers
// ==========================================================================

function buildStateDTO(row: QuizSessionRow): QuizStateDTO {
  const q = row.questions[row.current_index];
  if (!q) throw new Error(`No question at index ${row.current_index}`);
  const phase = row.phase as Exclude<QuizPhase, "closed">;
  return {
    sessionId: row.session_id,
    courseId: row.course_id,
    phase,
    currentIndex: row.current_index,
    totalQuestions: row.questions.length,
    question: q.question,
    options: q.options,
    ...(phase === "reveal_correct" && {
      correctIndices: q.correctIndices,
    }),
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
  courseId: string,
  questions: StoredQuestion[],
  user: UserDTO,
): Promise<string> {
  const sessionId = crypto.randomUUID();

  await userSQL(user)`
    INSERT INTO quiz_sessions
      (session_id, course_id, questions)
    VALUES
      (${sessionId}, ${courseId}, ${sqlParam(questions)})
  `;

  return sessionId;
}

/** waiting → active */
export async function launchQuizQuestion(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase      = 'active',
        updated_at = now()
    WHERE session_id = ${sessionId}
      AND phase = 'waiting'
  `;
}

/** active → reveal_dist */
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

/** reveal_dist → reveal_correct */
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

/** reveal_correct → active for next question; increments current_index */
export async function nextQuizQuestion(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase         = 'active',
        current_index = current_index + 1,
        updated_at    = now()
    WHERE session_id = ${sessionId}
      AND phase = 'reveal_correct'
  `;
}

/**
 * reveal_correct → summary (last question only).
 * Triggers the end-of-quiz reflection phase.
 */
export async function enterSummary(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase      = 'summary',
        updated_at = now()
    WHERE session_id = ${sessionId}
      AND phase = 'reveal_correct'
  `;
}

/** summary → closed. Teacher dismisses the summary screen. */
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

/** Force-closes any active (non-closed) quiz session for a course. */
export async function closeActiveQuizForCourse(
  courseId: string,
  user: UserDTO,
): Promise<void> {
  await userSQL(user)`
    UPDATE quiz_sessions
    SET phase      = 'closed',
        updated_at = now()
    WHERE course_id = ${courseId}
      AND phase != 'closed'
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
 * Store or update a student's answer for the current question.
 * Students may re-select as long as the phase remains active.
 */
export async function submitQuizResponse(
  sessionId: string,
  questionIndex: number,
  selected: number[],
  user: UserDTO,
): Promise<{ ok: boolean; reason?: string }> {
  const [session] = await userSQL(user)<Pick<QuizSessionRow, "phase" | "current_index">[]>`
    SELECT phase, current_index
    FROM quiz_sessions
    WHERE session_id = ${sessionId}
  `;

  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.phase !== "active") return { ok: false, reason: "phase_ended" };
  if (session.current_index !== questionIndex) return { ok: false, reason: "wrong_question" };

  await userSQL(user)`
    INSERT INTO quiz_responses (session_id, user_id, question_index, selected)
    VALUES (${sessionId}, ${user.id}, ${questionIndex}, ${sqlParam(selected)})
    ON CONFLICT (session_id, user_id, question_index)
    DO UPDATE SET selected = EXCLUDED.selected
  `;

  return { ok: true };
}

// ==========================================================================
// Student: poll for current quiz state
// ==========================================================================

export async function getActiveQuizForUser(user: UserDTO): Promise<QuizStateDTO | null> {
  if (!user.courseIds.length) return null;

  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, course_id, phase, questions,
           current_index, updated_at, created_at
    FROM quiz_sessions
    WHERE course_id = ANY(${sqlParam(user.courseIds)})
      AND phase != 'closed'
    LIMIT 1
  `;
  return row ? buildStateDTO(row) : null;
}
