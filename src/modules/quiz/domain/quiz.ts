/**
 * The live quiz of a lesson frame, question by question:
 *
 *   answering → distribution → revealed → (next question) answering … → ended
 *
 * Answering is never blocked by missing answers: the run is "ready" once
 * every participant has answered, but the teacher can always move on.
 * Results are anonymous; only counts leave the server.
 */

export type QuizOption = { id: string; label: string; correct: boolean };

export type QuizQuestion = {
  prompt: string;
  options: QuizOption[];
  /** false = exactly one correct option → radio buttons. */
  multiple: boolean;
};

export type QuizStep = "answering" | "distribution" | "revealed";

export type QuizRun = {
  id: string;
  /** Where the class belongs to, usually the course. */
  scope: string;
  courseId: string;
  chapterId: string;
  frameId: string;
  title: string;
  questions: QuizQuestion[];
  index: number;
  step: QuizStep;
  ended: boolean;
  /** Per question: participant → chosen option ids. */
  answers: Record<string, string[]>[];
  /** Per question: who takes part (present at the start, joined, or answered). */
  participants: string[][];
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 4;

/** The questions a quiz frame can run: 2–4 options and at least one correct. */
export function validQuestions(questions: QuizQuestion[]): boolean {
  return (
    questions.length > 0 &&
    questions.every(
      (question) =>
        question.options.length >= MIN_OPTIONS &&
        question.options.length <= MAX_OPTIONS &&
        question.options.some((option) => option.correct) &&
        (question.multiple ||
          question.options.filter((option) => option.correct).length === 1),
    )
  );
}

export function startRun(input: {
  id: string;
  scope: string;
  courseId: string;
  chapterId: string;
  frameId: string;
  title: string;
  questions: QuizQuestion[];
  present: string[];
}): QuizRun {
  const { present, ...rest } = input;
  return {
    ...rest,
    index: 0,
    step: "answering",
    ended: false,
    answers: input.questions.map(() => ({})),
    participants: input.questions.map((_, i) => (i === 0 ? [...present] : [])),
  };
}

function withParticipants(run: QuizRun, list: string[]): QuizRun {
  return {
    ...run,
    participants: run.participants.map((old, i) =>
      i === run.index ? list : old,
    ),
  };
}

/** A student who connects during the answering step takes part in it. */
export function joinRun(run: QuizRun, participant: string): QuizRun {
  const current = run.participants[run.index] ?? [];
  if (run.ended || run.step !== "answering" || current.includes(participant)) {
    return run;
  }
  return withParticipants(run, [...current, participant]);
}

/** A student who left without answering no longer holds the class up. */
export function leaveRun(run: QuizRun, participant: string): QuizRun {
  const current = run.participants[run.index] ?? [];
  const answered = run.answers[run.index]?.[participant];
  if (run.ended || run.step !== "answering" || answered) {
    return run;
  }
  return withParticipants(
    run,
    current.filter((other) => other !== participant),
  );
}

/** Accepts or replaces an answer while the question is open. */
export function answerRun(
  run: QuizRun,
  participant: string,
  index: number,
  optionIds: string[],
): QuizRun {
  const question = run.questions[index];
  if (
    run.ended ||
    run.step !== "answering" ||
    index !== run.index ||
    !question
  ) {
    return run;
  }
  const valid = new Set(question.options.map((option) => option.id));
  const chosen = [...new Set(optionIds)].filter((id) => valid.has(id));
  if (chosen.length === 0 || (!question.multiple && chosen.length !== 1)) {
    return run;
  }
  const joined = joinRun(run, participant);
  return {
    ...joined,
    answers: joined.answers.map((old, i) =>
      i === index ? { ...old, [participant]: chosen } : old,
    ),
  };
}

/**
 * One step further. `from` names the step the teacher saw, so a double
 * click or a second window can't skip a step.
 */
export function advanceRun(
  run: QuizRun,
  from: { index: number; step: QuizStep },
  present: string[],
): QuizRun {
  if (run.ended || from.index !== run.index || from.step !== run.step) {
    return run;
  }
  if (run.step === "answering") {
    return { ...run, step: "distribution" };
  }
  if (run.step === "distribution") {
    return { ...run, step: "revealed" };
  }
  const next = run.index + 1;
  if (next >= run.questions.length) {
    return { ...run, ended: true };
  }
  return {
    ...run,
    index: next,
    step: "answering",
    participants: run.participants.map((old, i) =>
      i === next ? [...present] : old,
    ),
  };
}

export type OptionCount = {
  id: string;
  count: number;
  /** Of the participants, 0–100. Each option on its own, so a multiple
   * choice question can add up to more than 100. */
  percent: number;
};

export type Distribution = {
  participants: number;
  answered: number;
  options: OptionCount[];
};

export function distribution(run: QuizRun, index = run.index): Distribution {
  const question = run.questions[index];
  const answers = Object.values(run.answers[index] ?? {});
  const participants = new Set([
    ...(run.participants[index] ?? []),
    ...Object.keys(run.answers[index] ?? {}),
  ]).size;
  return {
    participants,
    answered: answers.length,
    options: (question?.options ?? []).map((option) => {
      const count = answers.filter((chosen) =>
        chosen.includes(option.id),
      ).length;
      return {
        id: option.id,
        count,
        percent:
          participants === 0 ? 0 : Math.round((count / participants) * 100),
      };
    }),
  };
}

/** Everyone who takes part has answered: the teacher can go on. */
export function isReady(run: QuizRun): boolean {
  const { participants, answered } = distribution(run);
  return participants > 0 && answered >= participants;
}

/** "Richtig" when the chosen set is exactly the correct set. */
export function isCorrect(question: QuizQuestion, chosen: string[]): boolean {
  const correct = question.options
    .filter((option) => option.correct)
    .map((option) => option.id);
  return (
    chosen.length === correct.length &&
    correct.every((id) => chosen.includes(id))
  );
}
