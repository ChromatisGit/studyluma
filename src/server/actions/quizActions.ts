"use server";

import { getSession, assertAdminAccess, assertLoggedIn } from "@services/authService";
import {
  startQuizSession,
  launchQuizQuestion,
  revealDistribution,
  revealCorrectAnswer,
  nextQuizQuestion,
  enterSummary,
  closeQuizSession,
  closeActiveQuizForCourse,
  joinQuizSession,
  submitQuizResponse,
  getQuizResults,
  getQuizSummary,
  listQuizSessions,
} from "@services/quizService";
import type { StoredQuestion, QuizResultsDTO, QuizSummaryDTO } from "@schema/quizTypes";
import type { QuizSessionMeta } from "@services/quizService";

type OkResult<T> = { ok: true; data: T };
type ErrResult = { ok: false; error: string };
type Result<T> = OkResult<T> | ErrResult;

// ==========================================================================
// Admin: session lifecycle actions
// ==========================================================================

export async function startQuizAction(
  courseId: string,
  questions: StoredQuestion[],
): Promise<Result<{ sessionId: string }>> {
  const session = await getSession();
  assertAdminAccess(session);

  if (!questions.length || questions.length > 20) {
    return { ok: false, error: "Invalid question count" };
  }

  try {
    const sessionId = await startQuizSession(courseId, questions, session.user);
    return { ok: true, data: { sessionId } };
  } catch (err) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return { ok: false, error: "Für diesen Kurs läuft bereits ein Quiz." };
    }
    throw err;
  }
}

export async function launchQuizAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await launchQuizQuestion(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function revealDistributionAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await revealDistribution(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function revealCorrectAnswerAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await revealCorrectAnswer(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function nextQuizQuestionAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await nextQuizQuestion(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function enterSummaryAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await enterSummary(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function closeQuizAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await closeQuizSession(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function forceCloseQuizForCourseAction(courseId: string): Promise<Result<void>> {
  const session = await getSession();
  assertAdminAccess(session);
  await closeActiveQuizForCourse(courseId, session.user);
  return { ok: true, data: undefined };
}

// ==========================================================================
// Student: join + submit
// ==========================================================================

export async function joinQuizAction(sessionId: string): Promise<Result<void>> {
  const session = await getSession();
  assertLoggedIn(session);
  await joinQuizSession(sessionId, session.user);
  return { ok: true, data: undefined };
}

export async function submitQuizResponseAction(
  sessionId: string,
  questionIndex: number,
  selected: number[],
): Promise<Result<void>> {
  const session = await getSession();
  assertLoggedIn(session);

  const result = await submitQuizResponse(sessionId, questionIndex, selected, session.user);
  if (!result.ok) {
    return { ok: false, error: result.reason ?? "submission_failed" };
  }
  return { ok: true, data: undefined };
}

// ==========================================================================
// Admin: results polling
// ==========================================================================

export async function getQuizResultsAction(
  sessionId: string,
): Promise<Result<QuizResultsDTO>> {
  const session = await getSession();
  assertAdminAccess(session);

  const results = await getQuizResults(sessionId, session.user);
  if (!results) return { ok: false, error: "session_not_found" };
  return { ok: true, data: results };
}

export async function getQuizSummaryAction(
  sessionId: string,
): Promise<Result<QuizSummaryDTO>> {
  const session = await getSession();
  assertAdminAccess(session);

  const summary = await getQuizSummary(sessionId, session.user);
  if (!summary) return { ok: false, error: "session_not_found" };
  return { ok: true, data: summary };
}

export async function listQuizSessionsAction(
  courseId: string,
): Promise<Result<QuizSessionMeta[]>> {
  const session = await getSession();
  assertAdminAccess(session);

  const sessions = await listQuizSessions(courseId, session.user);
  return { ok: true, data: sessions };
}
