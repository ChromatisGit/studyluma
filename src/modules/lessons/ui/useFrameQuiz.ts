import { useCallback, useEffect, useState } from "react";
import { useTeacherQuiz } from "../../quiz";
import type { useLessonSession } from "../application/useLessonSession";
import type { Lesson, LessonSession } from "../domain/lesson";
import type { QuizActionsProps } from "./QuizActions";

/**
 * The course's live quiz as the teacher view drives it. The quiz belongs
 * to its frame: leaving the frame ends it, so students are never left in
 * a quiz nobody is running.
 */
export function useFrameQuiz(
  courseId: string,
  lesson: Lesson,
  session: LessonSession | null,
  dispatch: ReturnType<typeof useLessonSession>["dispatch"],
) {
  const { view, start, advance, end } = useTeacherQuiz(courseId);
  const [failed, setFailed] = useState(false);
  const currentId = session?.currentFrameId;
  const live =
    view && !view.ended && view.chapterId === lesson.chapterId ? view : null;
  const here = live && live.frameId === currentId ? live : null;
  const frame = lesson.frames.find((item) => item.id === currentId);
  const isQuizFrame = !!frame?.blocks?.some((block) => block.type === "quiz");

  useEffect(() => {
    if (live && currentId && live.frameId !== currentId) {
      void end(live);
    }
  }, [live, currentId, end]);

  const report = useCallback((ok: boolean) => setFailed(!ok), []);

  const onStart = useCallback(() => {
    if (frame) {
      void start(lesson.chapterId, frame.id).then(report);
    }
  }, [frame, lesson.chapterId, start, report]);

  /**
   * One step on in the running quiz. Returns "frame" after the last
   * reveal: the quiz ends and the lesson moves to the next frame.
   */
  const step = useCallback((): "quiz" | "frame" | null => {
    if (!here) {
      return null;
    }
    if (here.step === "revealed" && here.index + 1 >= here.total) {
      void end(here).then(report);
      return "frame";
    }
    void advance(here).then(report);
    return "quiz";
  }, [here, advance, end, report]);

  /** Frame steps; while a quiz runs, → and the clicker move the quiz on. */
  const onStep = useCallback(
    (by: 1 | -1) => {
      if (by === 1 && step() === "quiz") {
        return;
      }
      dispatch({ type: "step", by });
    },
    [step, dispatch],
  );

  const actions: QuizActionsProps | undefined = isQuizFrame
    ? { view: here, onStart, onStep: () => onStep(1), failed }
    : undefined;

  return { live, actions, onStep };
}
