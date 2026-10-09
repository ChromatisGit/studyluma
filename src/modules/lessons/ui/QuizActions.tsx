import type { TeacherQuizView } from "../../classroom";
import { fill } from "../../../helper/text";
import TEXT from "./lessons.de.json";

export interface QuizActionsProps {
  /** The run on this frame, or null before the start. */
  view: TeacherQuizView | null;
  onStart: () => void;
  /** Distribution → reveal → next question, or the end after the last. */
  onStep: () => void;
  failed: boolean;
}

function stepLabel(view: TeacherQuizView) {
  if (view.step === "answering") {
    return TEXT.quiz.showDistribution;
  }
  if (view.step === "distribution") {
    return TEXT.quiz.reveal;
  }
  return view.index + 1 < view.total
    ? TEXT.quiz.nextQuestion
    : TEXT.quiz.finish;
}

/**
 * The quiz in the notes strip: start, "15 / 18 beantwortet", then one
 * button for the next step. Missing answers never block it; once everyone
 * has answered the button turns primary.
 */
export function QuizActions({
  view,
  onStart,
  onStep,
  failed,
}: QuizActionsProps) {
  const failure = failed && (
    <span className="lt-notes__count lt-notes__count--failed">
      {TEXT.quiz.failed}
    </span>
  );
  if (!view) {
    return (
      <>
        {failure}
        <button type="button" className="lt-btn" onClick={onStart}>
          {TEXT.quiz.start}
        </button>
      </>
    );
  }
  const answering = view.step === "answering";
  const { answered, participants } = view.distribution;
  return (
    <>
      {failure}
      <span className="lt-notes__count" aria-live="polite">
        {fill(TEXT.quiz.position, {
          number: view.index + 1,
          total: view.total,
        })}
        {" · "}
        <strong>{fill(TEXT.quiz.answered, { answered, participants })}</strong>
        {answering && view.ready && ` · ${TEXT.quiz.allAnswered}`}
      </span>
      <button
        type="button"
        className={`lt-btn${answering && !view.ready ? " lt-btn--quiet" : ""}`}
        onClick={onStep}
      >
        {stepLabel(view)}
      </button>
    </>
  );
}
