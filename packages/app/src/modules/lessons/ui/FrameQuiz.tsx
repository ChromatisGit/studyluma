import { createContext, useContext } from "react";
import { RichContent, RichInlineContent } from "../../content-renderer";
import type { Quiz } from "../../catalog";
import type { TeacherQuizView } from "../../classroom";
import { fill } from "../../../helper/text";
import TEXT from "./lessons.de.json";

const LETTERS = "ABCDEFGH";

/** The course's running quiz, for the slides on the stage and projector. */
export const LiveQuizContext = createContext<{
  view: TeacherQuizView | null;
  teacher: boolean;
}>({ view: null, teacher: false });

/**
 * The running question. Bars appear with the distribution, each option
 * counted against all participants; the reveal marks the correct ones.
 */
function LiveQuestion({
  view,
  teacher,
}: {
  view: TeacherQuizView;
  teacher: boolean;
}) {
  const counted = view.step !== "answering";
  const revealed = view.step === "revealed";
  const { participants, answered } = view.distribution;
  return (
    <section className="lf-live" data-step={view.step} aria-live="polite">
      <p className="lf-quiz__number">
        {fill(TEXT.quiz.position, {
          number: view.index + 1,
          total: view.total,
        })}
        {view.question.multiple && (
          <span className="lf-live__kind">{TEXT.quiz.multiple}</span>
        )}
      </p>
      <RichContent
        nodes={view.question.content}
        className="lf-md lf-live__prompt"
      />
      <ol className="lf-live__options">
        {view.question.options.map((option, i) => {
          const count = view.distribution.options[i];
          const correct = revealed && option.correct;
          return (
            <li key={option.id} className={correct ? "is-correct" : undefined}>
              <span className="lf-quiz__letter">{LETTERS[i]}</span>
              {/* The tag lives in the label cell, so every row keeps its grid. */}
              <span className="lf-live__label">
                <RichInlineContent nodes={option.content} />
                {teacher && !revealed && option.correct && (
                  <span className="lf-live__teacher-answer">
                    {TEXT.quiz.correct}
                  </span>
                )}
              </span>
              {counted && count && (
                <span className="lf-live__result">
                  <span className="lf-live__track">
                    <span
                      className="lf-live__bar"
                      style={{ width: `${count.percent}%` }}
                    />
                  </span>
                  <span className="lf-live__count">
                    {fill(TEXT.quiz.count, {
                      count: count.count,
                      participants,
                      percent: count.percent,
                    })}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="lf-live__status">
        {view.step === "answering" ? (
          <>
            <strong>{TEXT.quiz.answerNow}</strong>
            <span>{fill(TEXT.quiz.answered, { answered, participants })}</span>
          </>
        ) : (
          <span>{fill(TEXT.quiz.answered, { answered, participants })}</span>
        )}
      </p>
    </section>
  );
}

/** True while no quiz runs on this slide: the class sees only its title. */
export function useQuizWaiting(slideId: string): boolean {
  const { view } = useContext(LiveQuizContext);
  return !(view && !view.ended && view.frameId === slideId);
}

/** The questions as prepared, for the teacher's notes; the class never sees them early. */
export function QuizPreview({ quiz }: { quiz: Quiz }) {
  return (
    <ol className="lt-quiz-preview">
      {quiz.questions.map((question) => (
        <li key={question.id}>
          <RichContent nodes={question.prompt} />
          <ol type="A">
            {question.options.map((option, k) => (
              <li key={k} className={option.correct ? "is-correct" : undefined}>
                <RichInlineContent nodes={option.content} />
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

/**
 * A quiz slide: the title and a calm line until the quiz starts, then the
 * running question. The questions stay hidden until their turn.
 */
export function QuizBlock({
  slideId,
  title,
}: {
  slideId: string;
  title: string;
}) {
  const { view, teacher } = useContext(LiveQuizContext);
  if (view && !view.ended && view.frameId === slideId) {
    return <LiveQuestion view={view} teacher={teacher} />;
  }
  return (
    <div className="lf-quiz-wait">
      <p className="lf-quiz-wait__title">{title}</p>
      <p className="lf-quiz-wait__line">{TEXT.quiz.soon}</p>
    </div>
  );
}
