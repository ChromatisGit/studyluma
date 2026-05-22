import { getSession } from "@platform/index.server";
import { assertAdminAccess, assertLoggedIn } from "@platform/auth/guards";
import {
  closeActiveQuizForCourse,
  closeQuizSession,
  enterSummary,
  joinQuizSession,
  launchQuizQuestion,
  nextQuizQuestion,
  revealCorrectAnswer,
  revealDistribution,
  startQuizSession,
  submitQuizResponse,
} from "@services/quizService";
import type { StoredQuestion } from "@schema/quizTypes";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function action({ request }: { request: Request }) {
  const session = await getSession(request);
  const body = await request.json() as Record<string, unknown>;
  const intent = text(body.intent);

  try {
    switch (intent) {
      case "start": {
        assertAdminAccess(session);
        const questions = Array.isArray(body.questions) ? body.questions as StoredQuestion[] : [];
        if (!questions.length || questions.length > 20) {
          return json({ ok: false, error: "Invalid question count" }, 400);
        }
        const sessionId = await startQuizSession(text(body.courseId), questions, session.user);
        return json({ ok: true, data: { sessionId } });
      }
      case "launch":
        assertAdminAccess(session);
        await launchQuizQuestion(text(body.sessionId), session.user);
        return json({ ok: true });
      case "reveal-distribution":
        assertAdminAccess(session);
        await revealDistribution(text(body.sessionId), session.user);
        return json({ ok: true });
      case "reveal-correct-answer":
        assertAdminAccess(session);
        await revealCorrectAnswer(text(body.sessionId), session.user);
        return json({ ok: true });
      case "next-question":
        assertAdminAccess(session);
        await nextQuizQuestion(text(body.sessionId), session.user);
        return json({ ok: true });
      case "enter-summary":
        assertAdminAccess(session);
        await enterSummary(text(body.sessionId), session.user);
        return json({ ok: true });
      case "close":
        assertAdminAccess(session);
        await closeQuizSession(text(body.sessionId), session.user);
        return json({ ok: true });
      case "force-close-course":
        assertAdminAccess(session);
        await closeActiveQuizForCourse(text(body.courseId), session.user);
        return json({ ok: true });
      case "join":
        assertLoggedIn(session);
        await joinQuizSession(text(body.sessionId), session.user);
        return json({ ok: true });
      case "submit": {
        assertLoggedIn(session);
        const selected = Array.isArray(body.selected)
          ? body.selected.filter((v): v is number => typeof v === "number")
          : [];
        const result = await submitQuizResponse(
          text(body.sessionId),
          Number(body.questionIndex),
          selected,
          session.user,
        );
        return result.ok
          ? json({ ok: true })
          : json({ ok: false, error: result.reason ?? "submission_failed" }, 400);
      }
      default:
        return json({ ok: false, error: "Unknown action" }, 400);
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "23505") {
      return json({ ok: false, error: "Für diesen Kurs läuft bereits ein Quiz." }, 409);
    }
    return json({ ok: false, error: error instanceof Error ? error.message : "Action failed" }, 500);
  }
}
