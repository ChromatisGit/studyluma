import { describe, expect, test } from "bun:test";
import {
  advanceRun,
  answerRun,
  distribution,
  isCorrect,
  isReady,
  joinRun,
  leaveRun,
  startRun,
  validQuestions,
  type QuizQuestion,
  type QuizRun,
} from "./quiz";
import { studentView } from "./views";

const single: QuizQuestion = {
  prompt: "$x^3 - 9x = 0$",
  multiple: false,
  options: [
    { id: "a", label: "Ausklammern", correct: true },
    { id: "b", label: "pq-Formel", correct: false },
    { id: "c", label: "Potenz isolieren", correct: false },
  ],
};
const multiple: QuizQuestion = {
  prompt: "Welche durch Ausklammern?",
  multiple: true,
  options: [
    { id: "a", label: "A", correct: true },
    { id: "b", label: "B", correct: true },
    { id: "c", label: "C", correct: false },
  ],
};

function run(present: string[], questions = [single, multiple]): QuizRun {
  return startRun({
    id: "r1",
    scope: "/mathe",
    courseId: "mathe",
    chapterId: "7-2",
    frameId: "quiz",
    title: "Quiz",
    questions,
    present,
  });
}

const at = (r: QuizRun) => ({ index: r.index, step: r.step });

/** Moves the run on `times` steps, with `present` at a new question. */
function steps(r: QuizRun, times: number, present: string[] = []): QuizRun {
  let next = r;
  for (let i = 0; i < times; i++) {
    next = advanceRun(next, at(next), present);
  }
  return next;
}

describe("live quiz", () => {
  test("questions need 2–4 options and a correct one", () => {
    expect(validQuestions([single, multiple])).toBe(true);
    expect(
      validQuestions([{ ...single, options: single.options.slice(0, 1) }]),
    ).toBe(false);
    expect(
      validQuestions([
        {
          ...single,
          options: single.options.map((o) => ({ ...o, correct: false })),
        },
      ]),
    ).toBe(false);
    expect(validQuestions([{ ...multiple, multiple: false }])).toBe(false);
  });

  test("present students take part; ready once all have answered", () => {
    let r = run(["s1", "s2"]);
    expect(distribution(r).participants).toBe(2);
    r = answerRun(r, "s1", 0, ["a"]);
    expect(isReady(r)).toBe(false);
    r = answerRun(r, "s2", 0, ["b"]);
    expect(isReady(r)).toBe(true);
  });

  test("a student joining during the question takes part in it", () => {
    let r = joinRun(run(["s1"]), "s2");
    expect(distribution(r).participants).toBe(2);
    r = advanceRun(r, at(r), ["s1", "s2"]);
    expect(joinRun(r, "s3")).toBe(r);
  });

  test("leaving without an answer no longer holds the class up", () => {
    let r = answerRun(run(["s1", "s2"]), "s1", 0, ["a"]);
    r = leaveRun(r, "s2");
    expect(isReady(r)).toBe(true);
    expect(leaveRun(r, "s1")).toBe(r);
  });

  test("single choice takes exactly one valid option", () => {
    const r = run(["s1"]);
    expect(answerRun(r, "s1", 0, ["a", "b"])).toBe(r);
    expect(answerRun(r, "s1", 0, ["x"])).toBe(r);
    expect(answerRun(r, "s1", 1, ["a"])).toBe(r);
  });

  test("percentages count each option against all participants", () => {
    let r = run(["s1", "s2", "s3", "s4"]);
    r = steps(r, 3, ["s1", "s2", "s3", "s4"]);
    expect(at(r)).toEqual({ index: 1, step: "answering" });
    r = answerRun(r, "s1", 1, ["a", "b"]);
    r = answerRun(r, "s2", 1, ["a"]);
    r = answerRun(r, "s3", 1, ["a", "b"]);
    const { options, participants, answered } = distribution(r);
    expect([participants, answered]).toEqual([4, 3]);
    expect(options.map((o) => [o.count, o.percent])).toEqual([
      [3, 75],
      [2, 50],
      [0, 0],
    ]);
  });

  test("steps go answering → distribution → revealed → next → ended", () => {
    let r = run([], [single]);
    r = advanceRun(r, at(r), []);
    expect(r.step).toBe("distribution");
    expect(advanceRun(r, { index: 0, step: "answering" }, [])).toBe(r);
    r = advanceRun(r, at(r), []);
    expect(r.step).toBe("revealed");
    r = advanceRun(r, at(r), []);
    expect(r.ended).toBe(true);
    expect(answerRun(r, "s1", 0, ["a"])).toBe(r);
  });

  test("students see the correct options only after the reveal", () => {
    let r = answerRun(run(["s1"]), "s1", 0, ["b"]);
    expect(studentView(r, "s1")?.question.options[0]?.correct).toBeUndefined();
    expect(studentView(r, "s1")?.answer).toEqual(["b"]);
    r = advanceRun(r, at(r), []);
    r = advanceRun(r, at(r), []);
    expect(studentView(r, "s1")?.question.options[0]?.correct).toBe(true);
    expect(isCorrect(single, ["b"])).toBe(false);
    expect(isCorrect(multiple, ["b", "a"])).toBe(true);
  });
});
