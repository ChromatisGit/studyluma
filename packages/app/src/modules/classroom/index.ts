import "./ui/teacher-controls.css";

// Who is looking.
export { isViewerRole, viewerRoles } from "./domain/viewer";
export type { ViewerRole } from "./domain/viewer";
export { readViewer } from "./infrastructure/viewerCookie";

// What the class is working on.
export { targetStore } from "./infrastructure/targetStore";
export type { ActiveTarget } from "./infrastructure/targetStore";
export { SiteContext, canReadSummary, useSite } from "./ui/SiteContext";
export type { SiteData } from "./ui/SiteContext";
export { SiteProvider } from "./ui/SiteProvider";
export { CurrentLesson } from "./ui/CurrentLesson";

// Teacher controls.
export { LernwegControl } from "./ui/LernwegControl";
export { Unterricht } from "./ui/Unterricht";
export { Inhalte } from "./ui/Inhalte";

// Joining and running a Classroom Session.
export { JoinPage } from "./ui/JoinPage";
export { ClassroomStart } from "./ui/ClassroomStart";
export { normalizeJoinCode } from "./domain/joinCode";
export type {
  ControllerSnapshot,
  ParticipantSnapshot,
  Snapshot,
} from "./domain/protocol";
export type { Placement } from "./domain/session";

// Live quiz.
export type {
  QuizOption,
  QuizQuestion,
  QuizStep,
  Distribution,
  OptionCount,
} from "./domain/quiz";
export type { StudentQuizView, TeacherQuizView } from "./domain/views";
export { useTeacherQuiz } from "./application/useLiveQuiz";
export { LiveQuizProvider, useLiveQuiz } from "./ui/LiveQuizProvider";
export type { LiveQuizProviderProps } from "./ui/LiveQuizProvider";
export { QuizPage } from "./ui/QuizPage";
export type { QuizPageProps } from "./ui/QuizPage";
export { default as quizText } from "./ui/quiz.de.json";
