import {
  distribution,
  isReady,
  type Distribution,
  type QuizQuestion,
  type QuizRun,
  type QuizStep,
} from "./quiz";
import type { RichInline } from "../../content-renderer";

type RunHead = {
  runId: string;
  courseId: string;
  chapterId: string;
  frameId: string;
  title: string;
  /** 0-based. */
  index: number;
  total: number;
  step: QuizStep;
  ended: boolean;
};

/** What the teacher view and the projector see: counts, never names. */
export type TeacherQuizView = RunHead & {
  question: QuizQuestion;
  distribution: Distribution;
  /** Everyone who takes part has answered. */
  ready: boolean;
};

/** What a student device sees: the correct options only once revealed. */
export type StudentQuizView = RunHead & {
  question: {
    content: QuizQuestion["content"];
    multiple: boolean;
    options: {
      id: string;
      content: RichInline[];
      correct?: boolean;
    }[];
  };
  /** This student's answer to the current question, if any. */
  answer: string[] | null;
};

function head(run: QuizRun): RunHead {
  return {
    runId: run.id,
    courseId: run.courseId,
    chapterId: run.chapterId,
    frameId: run.frameId,
    title: run.title,
    index: run.index,
    total: run.questions.length,
    step: run.step,
    ended: run.ended,
  };
}

export function teacherView(run: QuizRun): TeacherQuizView | null {
  const question = run.questions[run.index];
  if (!question) {
    return null;
  }
  return {
    ...head(run),
    question,
    distribution: distribution(run),
    ready: isReady(run),
  };
}

export function studentView(
  run: QuizRun,
  participant: string,
): StudentQuizView | null {
  const question = run.questions[run.index];
  if (!question) {
    return null;
  }
  const revealed = run.step === "revealed";
  return {
    ...head(run),
    question: {
      content: question.content,
      multiple: question.multiple,
      options: question.options.map(({ id, content, correct }) =>
        revealed ? { id, content, correct } : { id, content },
      ),
    },
    answer: run.answers[run.index]?.[participant] ?? null,
  };
}
