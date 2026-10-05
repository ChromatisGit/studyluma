import { useCallback, useEffect, useState } from "react";
import type { StudentQuizView, TeacherQuizView } from "../domain/views";
import type { QuizCommand } from "./liveQuizHttp";

/** The resource route that streams quiz views and takes commands. */
export const LIVE_QUIZ_PATH = "/live";

/** Follows the server's event stream; `undefined` until the first view. */
function useEventStream<T>(url: string | null): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);
  useEffect(() => {
    if (!url || typeof EventSource === "undefined") {
      return;
    }
    const source = new EventSource(url);
    source.onmessage = (event: MessageEvent<string>) => {
      try {
        setData(JSON.parse(event.data) as T);
      } catch {
        // ignore a broken message; the next one replaces it
      }
    };
    return () => source.close();
  }, [url]);
  return data;
}

/** Sends a command; the new state arrives through the stream. */
export async function sendQuizCommand(command: QuizCommand): Promise<boolean> {
  try {
    const response = await fetch(LIVE_QUIZ_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Teacher view and projector: the course's quiz with counts. */
export function useTeacherQuiz(courseId: string) {
  const view = useEventStream<TeacherQuizView | null>(
    `${LIVE_QUIZ_PATH}?course=${encodeURIComponent(courseId)}`,
  );
  const start = useCallback(
    (chapterId: string, frameId: string) =>
      sendQuizCommand({ intent: "start", courseId, chapterId, frameId }),
    [courseId],
  );
  const advance = useCallback(
    (current: TeacherQuizView) =>
      sendQuizCommand({
        intent: "advance",
        courseId,
        runId: current.runId,
        index: current.index,
        step: current.step,
      }),
    [courseId],
  );
  const end = useCallback(
    (current: TeacherQuizView) =>
      sendQuizCommand({ intent: "end", courseId, runId: current.runId }),
    [courseId],
  );
  return { view: view ?? null, start, advance, end };
}

/** A student device: the quizzes of all the student's courses. */
export function useStudentQuizzes(enabled: boolean) {
  const views = useEventStream<StudentQuizView[]>(
    enabled ? LIVE_QUIZ_PATH : null,
  );
  const answer = useCallback(
    (view: StudentQuizView, optionIds: string[]) =>
      sendQuizCommand({
        intent: "answer",
        courseId: view.courseId,
        runId: view.runId,
        index: view.index,
        optionIds,
      }),
    [],
  );
  return { views, answer };
}
