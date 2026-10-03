import type { LessonFrame } from "./lesson";

/**
 * The questions of a quiz frame as the live quiz runs them. Like the
 * Auswahl on worksheets: options keep their written order (A, B, C), and
 * more than one correct option makes it a multiple choice question.
 */
export function quizQuestions(frame: LessonFrame) {
  const blocks = [...(frame.blocks ?? []), ...(frame.columns ?? []).flat()];
  const quiz = blocks.find((block) => block.type === "quiz");
  if (!quiz) {
    return null;
  }
  return {
    title: frame.title,
    questions: quiz.questions.map((question) => ({
      prompt: question.prompt,
      multiple: question.options.filter((option) => option.correct).length > 1,
      options: question.options.map((option, i) => ({
        id: String.fromCharCode(97 + i),
        label: option.label,
        correct: option.correct,
      })),
    })),
  };
}
