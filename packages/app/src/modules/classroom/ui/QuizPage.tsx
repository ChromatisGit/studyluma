import { useState } from "react";
import { Link } from "react-router";
import { CircleCheck, Radio } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Page,
  PageHeader,
  Spinner,
  buttonClassName,
} from "@chromatis/base/ui";
import { RichContent } from "../../content-renderer";
import { AuswahlOptions } from "../../worksheets";
import { fill } from "../../../helper/text";
import { sameSet, unsentChoice } from "../domain/draft";
import type { StudentQuizView } from "../domain/views";
import { useLiveQuiz } from "./LiveQuizProvider";
import { useSite } from "./SiteContext";
import TEXT from "./quiz.de.json";
import "./quiz.css";

const LETTERS = "ABCDEFGH";

type CheckState = "richtig" | "nochNicht";

/** After the reveal: correct options green, a wrong pick marked. */
function revealStates(view: StudentQuizView) {
  const chosen = view.answer ?? [];
  const states: Record<string, CheckState> = {};
  for (const option of view.question.options) {
    if (option.correct) {
      states[option.id] = "richtig";
    } else if (chosen.includes(option.id)) {
      states[option.id] = "nochNicht";
    }
  }
  return states;
}

function RevealMessage({ view }: { view: StudentQuizView }) {
  const correct = view.question.options
    .map((option, i) => (option.correct ? LETTERS[i] : null))
    .filter(Boolean)
    .join(", ");
  const right =
    view.answer !== null &&
    sameSet(
      view.answer,
      view.question.options.filter((o) => o.correct).map((o) => o.id),
    );
  if (view.answer === null) {
    return (
      <Alert status="info">
        {fill(TEXT.page.missedReveal, { letters: correct })}
      </Alert>
    );
  }
  return right ? (
    <Alert status="success" icon={<CircleCheck className="icon" />}>
      {TEXT.page.right}
    </Alert>
  ) : (
    <Alert status="warning">
      {fill(TEXT.page.wrong, { letters: correct })}
    </Alert>
  );
}

/**
 * What happens while the others answer. One answer is handed in the moment
 * it is chosen; several answers wait for Abgeben, and the page says so.
 */
function AnswerBar({
  view,
  selected,
  busy,
  failed,
  onSubmit,
}: {
  view: StudentQuizView;
  selected: string[];
  busy: boolean;
  failed: boolean;
  onSubmit: () => void;
}) {
  const multiple = view.question.multiple;
  const submitted = view.answer !== null && sameSet(view.answer, selected);
  const retry = failed && selected.length > 0;
  return (
    <div className="quiz-answer">
      {submitted ? (
        <>
          <Badge status="success">{TEXT.page.submitted}</Badge>
          <p className="muted">
            {multiple ? TEXT.page.waiting : TEXT.page.waitingOne}
          </p>
        </>
      ) : (
        (multiple || retry) && (
          <>
            <Button
              busy={busy}
              disabled={selected.length === 0}
              onClick={onSubmit}
            >
              {retry
                ? TEXT.page.retry
                : view.answer === null
                  ? TEXT.page.submit
                  : TEXT.page.change}
            </Button>
            {multiple && (
              <p className="quiz-answer__pending" role="status">
                {view.answer === null
                  ? TEXT.page.pendingSubmit
                  : TEXT.page.pendingChange}
              </p>
            )}
          </>
        )
      )}
      {failed && <p className="quiz-answer__failed">{TEXT.page.failed}</p>}
    </div>
  );
}

function StepFooter({
  view,
  selected,
  busy,
  failed,
  onSubmit,
}: {
  view: StudentQuizView;
  selected: string[];
  busy: boolean;
  failed: boolean;
  onSubmit: () => void;
}) {
  if (view.step === "answering") {
    return (
      <AnswerBar
        view={view}
        selected={selected}
        busy={busy}
        failed={failed}
        onSubmit={onSubmit}
      />
    );
  }
  if (view.step === "revealed") {
    return <RevealMessage view={view} />;
  }
  return (
    <p className="muted">
      {view.answer === null ? TEXT.page.missed : TEXT.page.closed}
    </p>
  );
}

/** One question: prompt, the Auswahl as on worksheets, and its step. */
export function QuestionCard({ view }: { view: StudentQuizView }) {
  const { answer } = useLiveQuiz();
  const [draft, setDraft] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const answering = view.step === "answering";
  const selected = answering
    ? (draft ?? view.answer ?? [])
    : (view.answer ?? []);
  const submit = async (ids: string[]) => {
    setBusy(true);
    setFailed(false);
    const ok = await answer(view, ids);
    setBusy(false);
    setFailed(!ok);
  };
  const choose = (next: string[]) => {
    setDraft(next);
    // One answer counts the moment it is picked; several wait for Abgeben.
    if (!view.question.multiple) {
      void submit(next);
    }
  };
  // Ticks the teacher's next step left behind: say so instead of dropping them.
  const unsent = answering ? null : unsentChoice(view.answer, draft);
  return (
    <Card surface="default" border="default">
      <CardBody className="stack stack-500">
        <RichContent nodes={view.question.content} />
        <p className="muted quiz-hint">
          {view.question.multiple ? TEXT.page.chooseMany : TEXT.page.chooseOne}
        </p>
        <AuswahlOptions
          name={`quiz-${view.runId}-${view.index}`}
          legend={fill(TEXT.page.choose, { number: view.index + 1 })}
          options={view.question.options}
          multiple={view.question.multiple}
          selected={selected}
          onChange={choose}
          disabled={!answering}
          {...(view.step === "revealed" ? { states: revealStates(view) } : {})}
        />
        <StepFooter
          view={view}
          selected={selected}
          busy={busy}
          failed={failed}
          onSubmit={() => void submit(selected)}
        />
        {unsent && (
          <Alert status="warning">
            {unsent === "never"
              ? TEXT.page.unsentNever
              : TEXT.page.unsentChanged}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}

export interface QuizPageProps {
  courseId: string;
  coursePath: string;
  chapterPath: (chapterId: string) => string;
}

/** The student's quiz page; the teacher moves it on from the front. */
export function QuizPage({ courseId, coursePath, chapterPath }: QuizPageProps) {
  const { views, ended } = useLiveQuiz();
  const { classroom } = useSite();
  const view = views?.find((item) => item.courseId === courseId);
  if (ended || classroom === null) {
    // The unit is over (or this browser has no unit): nothing will start here.
    return (
      <Page title={TEXT.page.title}>
        <EmptyState
          icon={<Radio />}
          title={ended ? TEXT.page.unitEndedTitle : TEXT.page.noSessionTitle}
          description={
            ended ? TEXT.page.unitEndedText : TEXT.page.noSessionText
          }
          nextStep={TEXT.page.unitEndedNext}
          actions={
            <Link
              className={buttonClassName({ role: "secondary" })}
              to={coursePath}
            >
              {TEXT.page.toCourse}
            </Link>
          }
        />
      </Page>
    );
  }
  if (!views) {
    return (
      <Page title={TEXT.page.title}>
        <div className="quiz-connecting">
          <Spinner label={TEXT.page.connecting} />
          <span className="muted">{TEXT.page.connecting}</span>
        </div>
      </Page>
    );
  }
  if (!view || view.ended) {
    return (
      <Page title={TEXT.page.title}>
        <EmptyState
          icon={<Radio />}
          title={view ? TEXT.page.endedTitle : TEXT.page.noneTitle}
          description={view ? TEXT.page.endedText : TEXT.page.noneText}
          nextStep={view ? TEXT.page.endedNext : TEXT.page.noneNext}
          actions={
            <Link
              className={buttonClassName({ role: "secondary" })}
              to={view ? chapterPath(view.chapterId) : coursePath}
            >
              {view ? TEXT.page.toChapter : TEXT.page.toCourse}
            </Link>
          }
        />
      </Page>
    );
  }
  return (
    <Page title={`${TEXT.page.title}: ${view.title}`}>
      <PageHeader
        kicker={TEXT.page.kicker}
        title={view.title}
        meta={fill(TEXT.page.position, {
          number: view.index + 1,
          total: view.total,
        })}
      />
      <QuestionCard key={`${view.runId}-${view.index}`} view={view} />
    </Page>
  );
}
