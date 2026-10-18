import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudentQuizView } from "../domain/views";
import { QuestionCard } from "./QuizPage";
import TEXT from "./quiz.de.json";

const text = (value: string) => [{ type: "text" as const, value }];

const view = (over: Partial<StudentQuizView> = {}): StudentQuizView => ({
  runId: "r1",
  courseId: "k",
  chapterId: "c",
  frameId: "f",
  title: "Quiz",
  index: 0,
  total: 2,
  step: "answering",
  ended: false,
  question: {
    content: [{ type: "paragraph", children: text("Frage") }],
    multiple: false,
    options: [
      { id: "a", content: text("A1") },
      { id: "b", content: text("B1") },
    ],
  },
  answer: null,
  ...over,
});

const multiple = (over: Partial<StudentQuizView> = {}) =>
  view({ ...over, question: { ...view().question, multiple: true } });

const render = (v: StudentQuizView) =>
  renderToStaticMarkup(<QuestionCard view={v} />);

describe("student quiz question", () => {
  test("a single choice has no Abgeben button and says it counts at once", () => {
    const html = render(view());
    expect(html).toContain(TEXT.page.chooseOne);
    expect(html).not.toContain("<button");
  });

  test("a submitted single choice may be changed until the teacher moves on", () => {
    const html = render(view({ answer: ["a"] }));
    expect(html).toContain(TEXT.page.submitted);
    expect(html).toContain(TEXT.page.waitingOne);
    expect(html).not.toContain("<button");
  });

  test("a multiple choice keeps Abgeben and says it only counts after it", () => {
    const html = render(multiple());
    expect(html).toContain(`>${TEXT.page.submit}<`);
    expect(html).toContain(TEXT.page.pendingSubmit);
  });

  test("a submitted multiple choice is acknowledged without a button", () => {
    const html = render(multiple({ answer: ["a"] }));
    expect(html).toContain(TEXT.page.submitted);
    expect(html).not.toContain("<button");
  });

  test("the distribution step tells a student who never submitted", () => {
    expect(render(multiple({ step: "distribution" }))).toContain(
      TEXT.page.missed,
    );
  });
});
