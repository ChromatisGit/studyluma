export type { Lesson, LessonFrame, FrameBlock } from "./domain/lesson";
export {
  getLesson,
  hasLesson,
  schoolPeriods,
} from "./infrastructure/lessonRepository";
export { quizQuestions } from "./domain/quizFrame";
export { TeacherView } from "./ui/TeacherView";
export type { TeacherViewProps } from "./ui/TeacherView";
export { ProjectorView } from "./ui/ProjectorView";
export { default as lessonText } from "./ui/lessons.de.json";
