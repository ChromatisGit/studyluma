import "./ui/teacher-controls.css";

// Who is looking.
export { isViewerRole, viewerRoles } from "./domain/viewer";
export type { ViewerRole } from "./domain/viewer";
export { readViewer } from "./infrastructure/viewerCookie";

// What the class is working on.
export { targetStore } from "./infrastructure/targetStore";
export { localReleases } from "./infrastructure/localReleases";
export type { ActiveTarget } from "./infrastructure/targetStore";
export { SiteContext, canReadSummary, useSite } from "./ui/SiteContext";
export type { SiteData } from "./ui/SiteContext";
export { SiteProvider } from "./ui/SiteProvider";
export { ClassroomConnection } from "./ui/ClassroomConnection";
export { CurrentLesson } from "./ui/CurrentLesson";

// Teacher controls.
export { LernwegControl } from "./ui/LernwegControl";
export { Unterricht } from "./ui/Unterricht";
export type { UnterrichtProps } from "./ui/Unterricht";
export { Inhalte } from "./ui/Inhalte";

// Joining and running a Classroom Session.
export { JoinPage } from "./ui/JoinPage";
export {
  createClassroom,
  endClassroom,
  readClassroom,
  useSharedClassroom,
} from "./application/useClassroom";
export type { ClassroomConnection as ClassroomConnectionState } from "./application/useClassroom";
export { normalizeJoinCode } from "./domain/joinCode";
export { createFailureLimiter } from "./application/rateLimit";
export type {
  ControllerSnapshot,
  ParticipantSnapshot,
  Snapshot,
} from "./domain/protocol";
export type { Phase, Placement, Target } from "./domain/session";

// What the students do now.
export { useSendPhase } from "./application/usePhase";

// Sending worksheets to the class.
export { useSheetAccess, useSentTarget } from "./application/useSheetAccess";

// Worksheet monitoring.
export { useTeacherMonitoring } from "./application/useMonitoring";

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
export {
  LiveBanners,
  LiveQuizProvider,
  useDeviceFocus,
  useLiveQuiz,
} from "./ui/LiveQuizProvider";
export type { DeviceFocus, LiveQuizProviderProps } from "./ui/LiveQuizProvider";

// What a student device shows during a lesson.
export type { DeviceArea } from "./domain/focus";
export { CalmView } from "./ui/CalmView";
export { QuizPage } from "./ui/QuizPage";
export type { QuizPageProps } from "./ui/QuizPage";
export { default as quizText } from "./ui/quiz.de.json";
