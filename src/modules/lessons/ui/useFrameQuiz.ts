import { useCallback, useEffect, useState } from "react";
import { useTeacherQuiz } from "../../classroom";
import type { useLessonSession } from "../application/useLessonSession";
import type { Deck } from "../domain/deck";
import type { LessonSession } from "../domain/lesson";
import type { QuizActionsProps } from "./QuizActions";

/**
 * The course's live quiz as the teacher view drives it. The quiz belongs
 * to its slide: leaving the slide ends it, so students are never left in
 * a quiz nobody is running.
 */
export function useFrameQuiz(
  courseId: string,
  deck: Deck,
  session: LessonSession | null,
  dispatch: ReturnType<typeof useLessonSession>["dispatch"],
) {
  const { view, start, advance, end, place, running } =
    useTeacherQuiz(courseId);
  const [failed, setFailed] = useState(false);
  const currentId = session?.currentFrameId;
  const live =
    view && !view.ended && view.chapterId === deck.chapterId ? view : null;
  const here = live && live.frameId === currentId ? live : null;
  const slide = deck.slides.find((item) => item.id === currentId);
  const isQuiz = slide?.kind === "quiz";

  useEffect(() => {
    if (live && currentId && live.frameId !== currentId) {
      void end(live);
    }
  }, [live, currentId, end]);

  // Participants follow where the lesson is.
  useEffect(() => {
    if (running && currentId) {
      void place(deck.chapterId, currentId);
    }
  }, [running, currentId, deck.chapterId, place]);

  const report = useCallback((ok: boolean) => setFailed(!ok), []);

  const onStart = useCallback(() => {
    if (slide) {
      void start(deck.chapterId, slide.id).then(report);
    }
  }, [slide, deck.chapterId, start, report]);

  /**
   * One step on in the running quiz. Returns "frame" after the last
   * reveal: the quiz ends and the lesson moves to the next slide.
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

  /** Slide steps; while a quiz runs, → and the clicker move the quiz on. */
  const onStep = useCallback(
    (by: 1 | -1) => {
      if (by === 1 && step() === "quiz") {
        return;
      }
      dispatch({ type: "step", by });
    },
    [step, dispatch],
  );

  const actions: QuizActionsProps | undefined = isQuiz
    ? { view: here, onStart, onStep: () => onStep(1), failed }
    : undefined;

  return {
    live,
    actions,
    onStep,
    endActive: () => (live ? end(live) : Promise.resolve(true)),
  };
}
