import type { Quiz } from "../../catalog";
import type { QuizQuestion } from "../../classroom";

/**
 * The questions of a compiled Quiz as the live quiz runs them: in the
 * written order, options A, B, C, single or multiple choice exactly as the
 * author wrote it (`::mehrfach`).
 */
export function quizQuestions(quiz: Quiz): QuizQuestion[] {
  return quiz.questions.map((question) => ({
    content: question.prompt,
    multiple: question.multiple,
    options: question.options.map((option, i) => ({
      id: String.fromCharCode(97 + i),
      content: option.content,
      correct: !!option.correct,
    })),
  }));
}
