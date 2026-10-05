export type {
  QuizOption,
  QuizQuestion,
  QuizStep,
  Distribution,
  OptionCount,
} from "./domain/quiz";
export { validQuestions } from "./domain/quiz";
export type { StudentQuizView, TeacherQuizView } from "./domain/views";
export {
  parseQuizCommand,
  quizEventStream,
  quizScope,
} from "./application/liveQuizHttp";
export type { QuizCommand, QuizWatcher } from "./application/liveQuizHttp";
export { useTeacherQuiz } from "./application/useLiveQuiz";
export {
  advanceQuiz,
  answerQuiz,
  endQuiz,
  startQuiz,
} from "./infrastructure/liveQuizStore";
export { LiveQuizProvider, useLiveQuiz } from "./ui/LiveQuizProvider";
export type { LiveQuizProviderProps } from "./ui/LiveQuizProvider";
export { QuizPage } from "./ui/QuizPage";
export type { QuizPageProps } from "./ui/QuizPage";
export { default as quizText } from "./ui/quiz.de.json";
