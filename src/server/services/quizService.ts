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
import { publishToChannel } from "@server-lib/ablyServer";

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

type QuizResultsRow = QuizSessionRow & {
  participant_count: number;
  /** json_agg of quiz_responses.selected for the current question; null when no responses yet */
  responses: number[][] | null;
};

// ==========================================================================
// Helpers
// ==========================================================================

function buildStateDTO(row: QuizSessionRow): QuizStateDTO {
  const q = row.questions[row.current_index];
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

function buildResultsDTO(
  row: QuizResultsRow,
  allResponses?: { question_index: number; selected: number[] }[],
): QuizResultsDTO {
  const q = row.questions[row.current_index];
  const responses = row.responses ?? [];
  const optionCounts = new Array<number>(q.options.length).fill(0);
  for (const selected of responses) {
    for (const idx of selected) {
      if (idx >= 0 && idx < optionCounts.length) optionCounts[idx]++;
    }
  }

  const dto: QuizResultsDTO = {
    sessionId: row.session_id,
    courseId: row.course_id,
    phase: row.phase,
    currentIndex: row.current_index,
    totalQuestions: row.questions.length,
    question: q.question,
    options: q.options,
    correctIndices: q.correctIndices,
    participants: row.participant_count,
    answeredCount: responses.length,
    optionCounts,
    updatedAt: row.updated_at,
  };

  if (row.phase === "summary" && allResponses) {
    dto.questionSummaries = buildQuestionSummaries(
      row.questions,
      row.participant_count,
      allResponses,
    );
  }

  return dto;
}

function buildStudentDTOFromResults(results: QuizResultsDTO): QuizStateDTO {
  const phase = results.phase as Exclude<QuizPhase, "closed">;
  const isReveal = phase === "reveal_dist" || phase === "reveal_correct";

  const dto: QuizStateDTO = {
    sessionId: results.sessionId,
    courseId: results.courseId,
    phase,
    currentIndex: results.currentIndex,
    totalQuestions: results.totalQuestions,
    question: results.question,
    options: results.options,
    participants: results.participants,
    updatedAt: results.updatedAt,
  };

  if (phase === "reveal_correct" || phase === "summary") {
    dto.correctIndices = results.correctIndices;
  }

  if (isReveal) {
    dto.optionCounts = results.optionCounts;
    dto.answeredCount = results.answeredCount;
  }

  if (phase === "summary" && results.questionSummaries) {
    dto.questionSummaries = results.questionSummaries;
  }

  return dto;
}

function buildQuestionSummaries(
  questions: StoredQuestion[],
  participants: number,
  allResponses: { question_index: number; selected: number[] }[],
): QuizQuestionSummary[] {
  const byQuestion = new Map<number, number[][]>();
  for (const r of allResponses) {
    const list = byQuestion.get(r.question_index) ?? [];
    list.push(r.selected);
    byQuestion.set(r.question_index, list);
  }

  return questions.map((q, i) => {
    const responses = byQuestion.get(i) ?? [];
    const optionCounts = new Array<number>(q.options.length).fill(0);
    let correctCount = 0;
    for (const selected of responses) {
      for (const idx of selected) {
        if (idx >= 0 && idx < optionCounts.length) optionCounts[idx]++;
      }
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
      participants,
      optionCounts,
      percentCorrect: participants > 0 ? Math.round((correctCount / participants) * 100) : 0,
    };
  });
}

// ==========================================================================
// Ably broadcast helpers (best-effort; DB is source of truth)
// ==========================================================================

async function publishQuizUpdate(sessionId: string): Promise<void> {
  const [row] = await anonSQL<QuizResultsRow[]>`
    SELECT * FROM get_quiz_broadcast_data(${sessionId})
  `;
  if (!row) return;

  let allResponses: { question_index: number; selected: number[] }[] | undefined;
  if (row.phase === "summary") {
    allResponses = await anonSQL<{ question_index: number; selected: number[] }[]>`
      SELECT question_index, selected FROM quiz_responses WHERE session_id = ${sessionId}
    `;
  }

  const results = buildResultsDTO(row, allResponses);
  const studentState = buildStudentDTOFromResults(results);
  await Promise.all([
    publishToChannel(`classroom:${results.courseId}:admin`, { type: "QUIZ_STATE", quiz: results }),
    publishToChannel(`classroom:${results.courseId}:student`, { type: "QUIZ_STATE", quiz: studentState }),
  ]);
}

async function publishQuizClosed(courseId: string): Promise<void> {
  await Promise.all([
    publishToChannel(`classroom:${courseId}:admin`, { type: "QUIZ_STATE", quiz: null }),
    publishToChannel(`classroom:${courseId}:student`, { type: "QUIZ_STATE", quiz: null }),
  ]);
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
      (${sessionId}, ${courseId}, ${questions as never})
  `;

  await Promise.all([
    publishToChannel(`classroom:${courseId}:student`, { type: "QUIZ_STARTED", courseId, sessionId }),
    publishQuizUpdate(sessionId),
  ]);

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
  await publishQuizUpdate(sessionId);
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
  await publishQuizUpdate(sessionId);
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
  await publishQuizUpdate(sessionId);
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
  await publishQuizUpdate(sessionId);
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
  await publishQuizUpdate(sessionId);
}

/** summary → closed. Teacher dismisses the summary screen. */
export async function closeQuizSession(
  sessionId: string,
  user: UserDTO,
): Promise<void> {
  const [row] = await userSQL(user)<Pick<QuizSessionRow, "course_id">[]>`
    UPDATE quiz_sessions
    SET phase      = 'closed',
        updated_at = now()
    WHERE session_id = ${sessionId}
    RETURNING course_id
  `;
  if (row) await publishQuizClosed(row.course_id);
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
  await publishQuizClosed(courseId);
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
  await publishQuizUpdate(sessionId);
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
    VALUES (${sessionId}, ${user.id}, ${questionIndex}, ${selected as never})
    ON CONFLICT (session_id, user_id, question_index)
    DO UPDATE SET selected = EXCLUDED.selected
  `;

  await publishQuizUpdate(sessionId);

  return { ok: true };
}

// ==========================================================================
// Student: poll for current quiz state
// ==========================================================================

export async function getActiveQuizForCourse(
  courseId: string,
  user: UserDTO,
): Promise<QuizStateDTO | null> {
  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, course_id, phase, questions,
           current_index, updated_at, created_at
    FROM quiz_sessions
    WHERE course_id = ${courseId}
      AND phase != 'closed'
    LIMIT 1
  `;
  return row ? buildStateDTO(row) : null;
}

export async function getActiveQuizForUser(user: UserDTO): Promise<QuizStateDTO | null> {
  if (!user.courseIds.length) return null;

  const [row] = await userSQL(user)<QuizSessionRow[]>`
    SELECT session_id, course_id, phase, questions,
           current_index, updated_at, created_at
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

export async function getActiveQuizResults(
  courseId: string,
  user: UserDTO,
): Promise<QuizResultsDTO | null> {
  const [row] = await userSQL(user)<QuizResultsRow[]>`
    SELECT
      s.session_id, s.course_id, s.phase, s.questions,
      s.current_index, s.updated_at, s.created_at,
      (SELECT COUNT(*)::int FROM quiz_participants p WHERE p.session_id = s.session_id) AS participant_count,
      COALESCE(
        (SELECT json_agg(r.selected) FROM quiz_responses r
         WHERE r.session_id = s.session_id AND r.question_index = s.current_index),
        '[]'::json
      ) AS responses
    FROM quiz_sessions s
    WHERE s.course_id = ${courseId}
      AND s.phase != 'closed'
    LIMIT 1
  `;
  if (!row) return null;

  let allResponses: { question_index: number; selected: number[] }[] | undefined;
  if (row.phase === "summary") {
    allResponses = await userSQL(user)<{ question_index: number; selected: number[] }[]>`
      SELECT question_index, selected FROM quiz_responses WHERE session_id = ${row.session_id}
    `;
  }

  return buildResultsDTO(row, allResponses);
}

export async function getQuizResults(
  sessionId: string,
  user: UserDTO,
): Promise<QuizResultsDTO | null> {
  const [row] = await userSQL(user)<QuizResultsRow[]>`
    SELECT
      s.session_id, s.course_id, s.phase, s.questions,
      s.current_index, s.updated_at, s.created_at,
      (SELECT COUNT(*)::int FROM quiz_participants p WHERE p.session_id = s.session_id) AS participant_count,
      COALESCE(
        (SELECT json_agg(r.selected) FROM quiz_responses r
         WHERE r.session_id = s.session_id AND r.question_index = s.current_index),
        '[]'::json
      ) AS responses
    FROM quiz_sessions s
    WHERE s.session_id = ${sessionId}
  `;
  return row ? buildResultsDTO(row) : null;
}

// ==========================================================================
// Admin: post-session summary
// ==========================================================================

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

  const participantCount = await userSQL(user)<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM quiz_participants WHERE session_id = ${sessionId}
  `;
  const participants = participantCount[0]?.count ?? 0;

  const responseRows = await userSQL(user)<{ question_index: number; selected: number[] }[]>`
    SELECT question_index, selected FROM quiz_responses WHERE session_id = ${sessionId}
  `;

  return {
    sessionId: row.session_id,
    courseId: row.course_id,
    createdAt: row.created_at,
    questions: buildQuestionSummaries(row.questions, participants, responseRows),
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
