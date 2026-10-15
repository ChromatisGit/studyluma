import type { SummaryRule } from "../../catalog";
import type { AmpelCause, AmpelLevel } from "../../worksheets";
import type { QuizQuestion, QuizStep } from "./quiz";
import type { Placement, Target } from "./session";

export type QuizStart = {
  courseId: string;
  chapterId: string;
  frameId: string;
  title: string;
  questions: QuizQuestion[];
};

/** Everything a client may ask for. */
export type Intent =
  | { type: "invite" }
  | { type: "place"; placement: Placement | null }
  | { type: "target"; target: Target | null }
  | { type: "release.sheet"; sheetId: string; released: boolean }
  | { type: "release.summary"; chapterId: string; released: boolean }
  | { type: "release.rule"; chapterId: string; rule: SummaryRule }
  | { type: "release.solutions"; taskIds: string[]; released: boolean }
  | ({ type: "quiz.start" } & QuizStart)
  | {
      type: "quiz.advance";
      runId: string;
      index: number;
      step: QuizStep;
    }
  | { type: "quiz.end"; runId: string }
  | {
      type: "quiz.answer";
      runId: string;
      index: number;
      optionIds: string[];
    }
  | {
      type: "progress";
      sheetId: string;
      reached: number;
      done: boolean;
      challenges: boolean;
    }
  | {
      type: "ampel";
      sheetId: string;
      level: AmpelLevel;
      causes: AmpelCause[];
    }
  | { type: "end" };

export type ClassroomEvent =
  | { kind: "participant-joined"; participantId: string; name: string }
  | { kind: "participant-left"; participantId: string; name: string }
  | { kind: "placement-changed"; placement: Placement | null }
  | { kind: "target-changed"; target: Target | null }
  | {
      kind: "content-released";
      what: "summary" | "solutions" | "sheet";
      ids: string[];
      released: boolean;
    }
  | { kind: "quiz-started"; runId: string }
  | {
      kind: "response-submitted";
      runId: string;
      answered: number;
      participants: number;
    }
  | { kind: "quiz-revealed"; runId: string; index: number }
  | { kind: "quiz-ended"; runId: string }
  | { kind: "session-ended" };
