import { parseWorksheet, type Exercise } from "./parseWorksheet";

export type Answers = {
  responses: Record<string, string | string[]>;
  completed: boolean;
};

export function readAnswers(answer: string): Answers {
  try {
    const value: unknown = JSON.parse(answer);
    if (value && typeof value === "object" && "responses" in value) {
      const saved = value as Answers;
      if (saved.responses && typeof saved.responses === "object") {
        return {
          responses: saved.responses,
          completed: saved.completed === true,
        };
      }
    }
  } catch {
    // Earlier worksheets stored one free-text answer.
  }
  return { responses: answer ? { "0": answer } : {}, completed: false };
}

export function hasResponse(
  exercise: Exercise,
  value: string | string[] | undefined,
): boolean {
  if (exercise.kind === "gap") {
    return (
      Array.isArray(value) &&
      exercise.gaps.every((options, index) =>
        options.includes(value[index] ?? ""),
      )
    );
  }
  if (exercise.kind === "mcq") {
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(
        (item) =>
          item.trim() !== "" &&
          Number.isInteger(Number(item)) &&
          Number(item) >= 0 &&
          Number(item) < exercise.options.length,
      )
    );
  }
  if (exercise.kind === "single-choice") {
    return (
      typeof value === "string" &&
      value.trim() !== "" &&
      Number.isInteger(Number(value)) &&
      Number(value) >= 0 &&
      Number(value) < exercise.options.length
    );
  }
  return typeof value === "string" && value.trim().length > 0;
}

export function isWorksheetComplete(
  exercises: Exercise[],
  answers: Answers,
): boolean {
  return (
    exercises.length > 0 &&
    exercises.every((exercise) =>
      hasResponse(exercise, answers.responses[exercise.id]),
    )
  );
}

/** Shared by Website's authenticated route and hosts with their own answer store. */
export function prepareWorksheetAnswer(
  body: string,
  answer: string,
  complete: boolean,
):
  | { ok: true; answer: string; completed: boolean }
  | { ok: false; error: string } {
  if (answer.length > 10000) {
    return { ok: false, error: "Antwort ist zu lang." };
  }
  if (!complete) {
    return { ok: true, answer, completed: false };
  }
  const state = readAnswers(answer);
  if (!isWorksheetComplete(parseWorksheet(body), state)) {
    return { ok: false, error: "Bitte beantworte alle Aufgaben." };
  }
  return {
    ok: true,
    answer: JSON.stringify({ ...state, completed: true }),
    completed: true,
  };
}
