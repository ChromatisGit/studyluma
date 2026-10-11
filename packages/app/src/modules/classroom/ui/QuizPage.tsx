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
import type { StudentQuizView } from "../domain/views";
import { useLiveQuiz } from "./LiveQuizProvider";
import TEXT from "./quiz.de.json";
import "./quiz.css";

const LETTERS = "ABCDEFGH";

type CheckState = "richtig" | "nochNicht";

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((id) => b.includes(id));
}

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

/** Abgeben, and what happens while the others answer. */
function AnswerBar({
  view,
  selected,
}: {
  view: StudentQuizView;
  selected: string[];
}) {
  const { answer } = useLiveQuiz();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitted = view.answer !== null && sameSet(view.answer, selected);
  const submit = async () => {
    setBusy(true);
    const ok = await answer(view, selected);
    setBusy(false);
    setFailed(!ok);
  };
  return (
    <div className="quiz-answer">
      {submitted ? (
        <>
          <Badge status="success">{TEXT.page.submitted}</Badge>
          <p className="muted">{TEXT.page.waiting}</p>
        </>
      ) : (
        <Button
          busy={busy}
          disabled={selected.length === 0}
          onClick={() => void submit()}
        >
          {view.answer === null ? TEXT.page.submit : TEXT.page.change}
        </Button>
      )}
      {failed && <p className="quiz-answer__failed">{TEXT.page.failed}</p>}
    </div>
  );
}

function StepFooter({
  view,
  selected,
}: {
  view: StudentQuizView;
  selected: string[];
}) {
  if (view.step === "answering") {
    return <AnswerBar view={view} selected={selected} />;
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
function QuestionCard({ view }: { view: StudentQuizView }) {
  const [draft, setDraft] = useState<string[] | null>(null);
  const selected =
    view.step === "answering"
      ? (draft ?? view.answer ?? [])
      : (view.answer ?? []);
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
          onChange={setDraft}
          disabled={view.step !== "answering"}
          {...(view.step === "revealed" ? { states: revealStates(view) } : {})}
        />
        <StepFooter view={view} selected={selected} />
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
  const { views } = useLiveQuiz();
  const view = views?.find((item) => item.courseId === courseId);
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
