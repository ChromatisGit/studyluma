import { useCallback, useEffect, useMemo, useState } from "react";
import type { SheetReporter } from "../../worksheets";
import { TEACHER_AWAY_NOTICE_MS } from "../domain/presence";
import type { Snapshot } from "../domain/protocol";
import type { StudentQuizView, TeacherQuizView } from "../domain/views";
import { useSite } from "../ui/SiteContext";
import { postClassroom, useSharedClassroom } from "./useClassroom";

/** Teacher view and projector: the session's quiz with counts. */
export function useTeacherQuiz(courseId: string) {
  const { classroom } = useSite();
  const { snapshot, send } = useSharedClassroom(
    classroom?.role === "controller",
  );
  const view = snapshot?.role === "controller" ? (snapshot.quiz ?? null) : null;
  const start = useCallback(
    (chapterId: string, frameId: string) =>
      postClassroom({ intent: "quiz.start", courseId, chapterId, frameId }),
    [courseId],
  );
  /** Starts one of the chapter's quizzes without a presentation. */
  const startAlone = useCallback(
    (chapterId: string, quizId: string) =>
      postClassroom({ intent: "quiz.start", courseId, chapterId, quizId }),
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
  return {
    view,
    start,
    startAlone,
    advance,
    end,
    place,
    running: classroom !== null,
  };
}

/**
 * Whether the teacher has been away long enough to tell the student. The
 * server reports how long as of the snapshot; the device counts on from there,
 * so no clock of the server is needed and nothing is pushed at the threshold.
 */
function useTeacherAway(snapshot: Snapshot | null | undefined): boolean {
  const away =
    snapshot?.role === "participant" ? snapshot.teacherAwayForMs : null;
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (away === null) {
      setElapsed(0);
      return;
    }
    const received = Date.now();
    setElapsed(0);
    const timer = setInterval(() => setElapsed(Date.now() - received), 5000);
    return () => clearInterval(timer);
  }, [snapshot, away]);
  return away !== null && away + elapsed >= TEACHER_AWAY_NOTICE_MS;
}

/** A student device: the quiz of the session the student joined. */
export function useStudentQuizzes(enabled: boolean) {
  const { classroom } = useSite();
  const { snapshot, send, ended } = useSharedClassroom(
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
  /** Changes whenever the teacher releases or sends something. */
  const sync =
    snapshot?.role === "participant"
      ? JSON.stringify([snapshot.releases, snapshot.target])
      : undefined;
  /** Reports of the student's worksheet work, to the class's totals. */
  const reporter: SheetReporter = useMemo(
    () => ({
      progress: (report) => void send({ type: "progress", ...report }),
      ampel: (report) => void send({ type: "ampel", ...report }),
    }),
    [send],
  );
  const teacherAway = useTeacherAway(snapshot);
  /** The sent sheet; undefined until the first snapshot, null: nothing sent. */
  const sent =
    snapshot?.role === "participant"
      ? { target: snapshot.target, courseId: snapshot.courseId }
      : undefined;
  /** What the students do now; undefined until the first snapshot. */
  const phase = snapshot?.role === "participant" ? snapshot.phase : undefined;
  const name = snapshot?.role === "participant" ? snapshot.you.name : null;
  return {
    views,
    answer,
    sync,
    reporter,
    teacherAway,
    sent,
    ended,
    phase,
    name,
  };
}
