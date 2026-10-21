import { useState } from "react";
import { Alert, Badge, Button } from "@chromatis/base/ui";
import { RichContent, RichInlineContent } from "../../content-renderer";
import { fill } from "../../../helper/text";
import { useTeacherQuiz } from "../application/useLiveQuiz";
import { useCatalog } from "../../catalog";
import type { TeacherQuizView } from "../domain/views";
import TEXT from "./classroom.de.json";

function stepLabel(view: TeacherQuizView): string {
  if (view.step === "answering") {
    return TEXT.quizzes.showDistribution;
  }
  if (view.step === "distribution") {
    return TEXT.quizzes.reveal;
  }
  return view.index + 1 < view.total
    ? TEXT.quizzes.nextQuestion
    : TEXT.quizzes.finish;
}

/** The running question with the class's answers; the teacher moves it on. */
function RunningQuiz({
  view,
  onStep,
  onStop,
}: {
  view: TeacherQuizView;
  onStep: () => void;
  onStop: () => void;
}) {
  const { answered, participants } = view.distribution;
  const counted = view.step !== "answering";
  return (
    <div className="stack stack-300" aria-live="polite">
      <p>
        <strong>
          {fill(TEXT.quizzes.position, {
            number: view.index + 1,
            total: view.total,
          })}
        </strong>
      </p>
      <RichContent nodes={view.question.content} />
      <ol type="A">
        {view.question.options.map((option, i) => {
          const count = view.distribution.options[i];
          return (
            <li key={option.id}>
              <RichInlineContent nodes={option.content} />
              {option.correct && (
                <>
                  {" "}
                  <Badge status="success">{TEXT.quizzes.correct}</Badge>
                </>
              )}
              {counted && count && ` · ${count.count} (${count.percent} %)`}
            </li>
          );
        })}
      </ol>
      <p>
        {fill(TEXT.quizzes.answered, { answered, participants })}
        {view.step === "answering" &&
          view.ready &&
          ` · ${TEXT.quizzes.allAnswered}`}
      </p>
      <div className="teacher-controls-actions">
        <Button role="secondary" size="sm" onClick={onStop}>
          {TEXT.quizzes.stop}
        </Button>
        <Button size="sm" onClick={onStep}>
          {stepLabel(view)}
        </Button>
      </div>
    </div>
  );
}

/**
 * The chapter's quizzes, played with the class without a presentation. The
 * students are sent to the quiz page like for a quiz on a slide.
 */
export function ChapterQuizzes({
  courseId,
  chapterId,
}: {
  courseId: string;
  chapterId: string;
}) {
  const catalog = useCatalog();
  const { view, startAlone, advance, end, running } = useTeacherQuiz(courseId);
  const [failed, setFailed] = useState(false);
  const quizzes = catalog.quizzes.filter(
    (quiz) => quiz.chapterId === chapterId,
  );
  const live =
    view && !view.ended && view.chapterId === chapterId ? view : null;
  const report = (ok: boolean) => setFailed(!ok);
  const step = () => {
    if (!live) {
      return;
    }
    const last = live.step === "revealed" && live.index + 1 >= live.total;
    void (last ? end(live) : advance(live)).then(report);
  };
  if (!quizzes.length) {
    return <p>{TEXT.quizzes.none}</p>;
  }
  return (
    <div className="stack stack-300">
      {!running && <Alert status="info">{TEXT.quizzes.needSession}</Alert>}
      {failed && <Alert status="warning">{TEXT.quizzes.failed}</Alert>}
      {live ? (
        <RunningQuiz
          view={live}
          onStep={step}
          onStop={() => void end(live).then(report)}
        />
      ) : (
        <ul className="teacher-controls-access-list">
          {quizzes.map((quiz) => (
            <li key={quiz.id} className="teacher-controls-access-row">
              <div>
                <strong>{quiz.title}</strong>{" "}
                <small>
                  {fill(TEXT.quizzes.questions, {
                    count: quiz.questions.length,
                  })}
                </small>
              </div>
              <div className="teacher-controls-access-actions">
                <Button
                  size="sm"
                  disabled={!running}
                  onClick={() =>
                    void startAlone(chapterId, quiz.id).then(report)
                  }
                >
                  {TEXT.quizzes.start}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
