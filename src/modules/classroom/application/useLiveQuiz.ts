import { useCallback } from "react";
import type { StudentQuizView, TeacherQuizView } from "../domain/views";
import { useSite } from "../ui/SiteContext";
import { postClassroom, useClassroom } from "./useClassroom";

/** Teacher view and projector: the session's quiz with counts. */
export function useTeacherQuiz(courseId: string) {
  const { classroom } = useSite();
  const { snapshot, send } = useClassroom(classroom?.role === "controller");
  const view = snapshot?.role === "controller" ? (snapshot.quiz ?? null) : null;
  const start = useCallback(
    (chapterId: string, frameId: string) =>
      postClassroom({ intent: "quiz.start", courseId, chapterId, frameId }),
    [courseId],
  );
  const advance = useCallback(
    (current: TeacherQuizView) =>
      send({
        type: "quiz.advance",
        runId: current.runId,
        index: current.index,
        step: current.step,
      }),
    [send],
  );
  const end = useCallback(
    (current: TeacherQuizView) =>
      send({ type: "quiz.end", runId: current.runId }),
    [send],
  );
  /** Tells the participants where the lesson is. */
  const place = useCallback(
    (chapterId: string, frameId: string | null) =>
      send({ type: "place", placement: { chapterId, frameId } }),
    [send],
  );
  return { view, start, advance, end, place, running: classroom !== null };
}

/** A student device: the quiz of the session the student joined. */
export function useStudentQuizzes(enabled: boolean) {
  const { classroom } = useSite();
  const { snapshot, send } = useClassroom(
    enabled && classroom?.role === "participant",
  );
  const views: StudentQuizView[] | undefined =
    snapshot === undefined
      ? undefined
      : snapshot?.role === "participant" && snapshot.quiz
        ? [snapshot.quiz]
        : [];
  const answer = useCallback(
    (view: StudentQuizView, optionIds: string[]) =>
      send({
        type: "quiz.answer",
        runId: view.runId,
        index: view.index,
        optionIds,
      }),
    [send],
  );
  return { views, answer };
}
