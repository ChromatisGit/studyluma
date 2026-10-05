import type { QuizStep } from "../domain/quiz";
import {
  watchAsStudent,
  watchAsTeacher,
} from "../infrastructure/liveQuizStore";

/** Quizzes are kept per course and room (see viewer's room cookie). */
export function quizScope(room: string, courseId: string): string {
  return `${room}/${courseId}`;
}

export type QuizWatcher =
  | { role: "teacher"; scope: string }
  | { role: "student"; participant: string; scopes: string[] };

/**
 * A server-sent event stream with the current view of the quiz. The
 * browser reconnects on its own; a comment line every 20 s keeps proxies
 * from closing an idle connection.
 */
export function quizEventStream(
  request: Request,
  watcher: QuizWatcher,
  headers: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();
  let stop = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const send = (data: unknown) =>
        write(`data: ${JSON.stringify(data)}\n\n`);
      const unwatch =
        watcher.role === "teacher"
          ? watchAsTeacher(watcher.scope, send)
          : watchAsStudent(watcher.participant, watcher.scopes, send);
      const keepAlive = setInterval(() => write(": ping\n\n"), 20_000);
      stop = () => {
        clearInterval(keepAlive);
        unwatch();
        stop = () => {};
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      request.signal.addEventListener("abort", () => stop());
    },
    cancel() {
      stop();
    },
  });
  return new Response(body, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export type QuizCommand =
  | { intent: "start"; courseId: string; chapterId: string; frameId: string }
  | {
      intent: "advance";
      courseId: string;
      runId: string;
      index: number;
      step: QuizStep;
    }
  | { intent: "end"; courseId: string; runId: string }
  | {
      intent: "answer";
      courseId: string;
      runId: string;
      index: number;
      optionIds: string[];
    };

const STEPS: QuizStep[] = ["answering", "distribution", "revealed"];

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 200;
}

/** Validates a command posted by a teacher or student window. */
export function parseQuizCommand(input: unknown): QuizCommand | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const c = input as Record<string, unknown>;
  if (!isText(c.courseId)) {
    return null;
  }
  const courseId = c.courseId;
  const index = Number.isInteger(c.index) ? (c.index as number) : -1;
  switch (c.intent) {
    case "start":
      return isText(c.chapterId) && isText(c.frameId)
        ? {
            intent: "start",
            courseId,
            chapterId: c.chapterId,
            frameId: c.frameId,
          }
        : null;
    case "advance":
      return isText(c.runId) && index >= 0 && STEPS.includes(c.step as QuizStep)
        ? {
            intent: "advance",
            courseId,
            runId: c.runId,
            index,
            step: c.step as QuizStep,
          }
        : null;
    case "end":
      return isText(c.runId)
        ? { intent: "end", courseId, runId: c.runId }
        : null;
    case "answer":
      return isText(c.runId) &&
        index >= 0 &&
        Array.isArray(c.optionIds) &&
        c.optionIds.length <= 8 &&
        c.optionIds.every(isText)
        ? {
            intent: "answer",
            courseId,
            runId: c.runId,
            index,
            optionIds: c.optionIds as string[],
          }
        : null;
    default:
      return null;
  }
}
