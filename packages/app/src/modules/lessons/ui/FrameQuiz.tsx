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

/** Before the start: all questions side by side, as prepared. */
function PreparedQuiz({ quiz }: { quiz: Quiz }) {
  return (
    <div className="lf-quiz">
      {quiz.questions.map((question, i) => (
        <section key={question.id} className="lf-quiz__question">
          <p className="lf-quiz__number">
            {fill(TEXT.frame.question, { number: i + 1 })}
          </p>
          <RichContent nodes={question.prompt} className="lf-md" />
          <ol className="lf-quiz__options">
            {question.options.map((option, k) => (
              <li key={k}>
                <span className="lf-quiz__letter">{LETTERS[k]}</span>
                <RichInlineContent nodes={option.content} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

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
              <RichInlineContent nodes={option.content} />
              {teacher && !revealed && option.correct && (
                <span className="lf-live__teacher-answer">Richtig</span>
              )}
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

/** A quiz slide: prepared questions, or the live question while it runs. */
export function QuizBlock({ quiz, slideId }: { quiz: Quiz; slideId: string }) {
  const { view, teacher } = useContext(LiveQuizContext);
  return view && !view.ended && view.frameId === slideId ? (
    <LiveQuestion view={view} teacher={teacher} />
  ) : (
    <PreparedQuiz quiz={quiz} />
  );
}
