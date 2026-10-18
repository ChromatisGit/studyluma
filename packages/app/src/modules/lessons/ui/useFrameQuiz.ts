import { useCallback, useEffect, useState } from "react";
import { useSite, useTeacherQuiz } from "../../classroom";
import type { useLessonSession } from "../application/useLessonSession";
import type { Deck } from "../domain/deck";
import type { DeckState } from "../domain/lesson";
import type { TeacherQuizView } from "../../classroom";
import type { QuizActionsProps } from "./QuizActions";

type Dispatch = ReturnType<typeof useLessonSession>["dispatch"];
type SessionChange = Parameters<Dispatch>[0];

/**
 * Holds back moves off the slide of a running quiz until the teacher
 * confirms. `leave` is set while a question waits for an answer.
 */
function useLeaveGuard(
  here: TeacherQuizView | null,
  currentId: string | undefined,
  rawDispatch: Dispatch,
  end: (view: TeacherQuizView) => Promise<boolean>,
) {
  // The move the teacher has not yet confirmed.
  const [pending, setPending] = useState<SessionChange | null>(null);
  const dispatch = useCallback<Dispatch>(
    (action) => {
      if (pending) {
        return;
      }
      const leaves =
        action.type === "step" ||
        action.type === "addBlank" ||
        (action.type === "go" && action.frameId !== currentId);
      if (here && leaves) {
        setPending(action);
        return;
      }
      rawDispatch(action);
    },
    [pending, here, currentId, rawDispatch],
  );
  // The quiz ended by other means: nothing is left to confirm.
  useEffect(() => {
    if (pending && !here) {
      setPending(null);
    }
  }, [pending, here]);
  const leave = pending
    ? {
        confirm: () => {
          if (here) {
            void end(here);
          }
          rawDispatch(pending);
          setPending(null);
        },
        cancel: () => setPending(null),
      }
    : null;
  return { dispatch, leave, pending: pending !== null };
}

/**
 * The course's live quiz as the teacher view drives it. The quiz belongs
 * to its slide: leaving the slide ends it, so students are never left in
 * a quiz nobody is running. The teacher is asked before that happens: the
 * returned `dispatch` holds back every move off the quiz slide (slide
 * jumps, steps back, a new blank) while its quiz runs, until `leave` is
 * answered. Only the step after the last reveal moves on without asking.
 */
export function useFrameQuiz(
  courseId: string,
  deck: Deck,
  session: DeckState | null,
  rawDispatch: Dispatch,
) {
  const { classroomEnabled } = useSite();
  const { view, start, advance, end, place, running } =
    useTeacherQuiz(courseId);
  const [failed, setFailed] = useState(false);
  const currentId = session?.currentFrameId;
  const live =
    view && !view.ended && view.chapterId === deck.chapterId ? view : null;
  const here = live && live.frameId === currentId ? live : null;
  const slide = deck.slides.find((item) => item.id === currentId);
  const isQuiz = slide?.kind === "quiz";

  // The safety net behind the question: whatever moves the lesson off the
  // quiz slide, the run does not outlive it.
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

  const { dispatch, leave, pending } = useLeaveGuard(
    here,
    currentId,
    rawDispatch,
    end,
  );

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
      if (pending) {
        return;
      }
      if (by === 1) {
        const moved = step();
        if (moved === "quiz") {
          return;
        }
        if (moved === "frame") {
          // The quiz is over: this move needs no question.
          rawDispatch({ type: "step", by });
          return;
        }
      }
      dispatch({ type: "step", by });
    },
    [pending, step, dispatch, rawDispatch],
  );

  // Without the classroom there is no session to run a quiz in.
  const actions: QuizActionsProps | undefined =
    isQuiz && classroomEnabled
      ? { view: here, onStart, onStep: () => onStep(1), failed }
      : undefined;

  return {
    live,
    actions,
    dispatch,
    leave,
    onStep,
    endActive: () => (live ? end(live) : Promise.resolve(true)),
  };
}
