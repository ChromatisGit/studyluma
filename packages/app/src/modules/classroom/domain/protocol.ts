/**
 * The Classroom realtime protocol: JSON text frames between a client and the
 * Classroom Session. The server pushes a personalised snapshot after every
 * change and, additionally, the named events of the session.
 *
 * Authentication is not part of the frames: the connection carries a
 * Controller or Participant Token (see the runtime), never the join code.
 */

import {
  presentIds,
  type ClassroomEvent,
  type ClassroomSession,
  type Intent,
  type Placement,
  type Rejection,
  type Releases,
} from "./session";
import type { QuizStep } from "./quiz";
import {
  studentView,
  teacherView,
  type StudentQuizView,
  type TeacherQuizView,
} from "./views";

type SnapshotBase = {
  code: string;
  courseId: string | null;
  title: string;
  status: ClassroomSession["status"];
  placement: Placement | null;
  releases: Releases;
};

export type ControllerSnapshot = SnapshotBase & {
  role: "controller";
  participants: { id: string; name: string; connected: boolean }[];
  quiz: TeacherQuizView | null;
};

export type ParticipantSnapshot = SnapshotBase & {
  role: "participant";
  you: { id: string; name: string };
  /** Connected participants; names stay with the controller. */
  participantCount: number;
  quiz: StudentQuizView | null;
};

export type Snapshot = ControllerSnapshot | ParticipantSnapshot;

export type ServerMessage =
  | { type: "snapshot"; snapshot: Snapshot }
  | { type: "event"; event: ClassroomEvent }
  | { type: "error"; reason: Rejection | "bad-message" }
  | { type: "pong" };

/** Intents a client may send over the connection. */
export type WireIntent = Exclude<
  Intent,
  | { type: "quiz.start" }
  | { type: "release.summary" }
  | { type: "release.rule" }
  | { type: "release.solutions" }
>;

export type ClientMessage =
  { type: "intent"; intent: WireIntent } | { type: "ping" };

export function controllerSnapshot(
  session: ClassroomSession,
): ControllerSnapshot {
  return {
    ...base(session),
    role: "controller",
    participants: session.participants.map(({ id, name, connected }) => ({
      id,
      name,
      connected,
    })),
    quiz: session.quiz && teacherView(session.quiz),
  };
}

export function participantSnapshot(
  session: ClassroomSession,
  participantId: string,
): ParticipantSnapshot | null {
  const me = session.participants.find((item) => item.id === participantId);
  if (!me) {
    return null;
  }
  return {
    ...base(session),
    role: "participant",
    you: { id: me.id, name: me.name },
    participantCount: presentIds(session).length,
    quiz: session.quiz && studentView(session.quiz, participantId),
  };
}

function base(session: ClassroomSession): SnapshotBase {
  return {
    code: session.code,
    courseId: session.courseId,
    title: session.title,
    status: session.status,
    placement: session.placement,
    releases: session.releases,
  };
}

/** What this role may learn from an event; names and answers stay private. */
export function eventFor(
  role: "controller" | "participant",
  event: ClassroomEvent,
): ClassroomEvent | null {
  switch (event.kind) {
    case "participant-joined":
    case "participant-left":
    case "response-submitted":
      return role === "controller" ? event : null;
    default:
      return event;
  }
}

const STEPS: QuizStep[] = ["answering", "distribution", "revealed"];

function text(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

function parseWireIntent(input: unknown): WireIntent | null {
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const c = input as Record<string, unknown>;
  const index = Number.isInteger(c.index) ? (c.index as number) : -1;
  switch (c.type) {
    case "place": {
      if (c.placement === null) {
        return { type: "place", placement: null };
      }
      const p = c.placement as Record<string, unknown> | undefined;
      return p && text(p.chapterId) && (p.frameId === null || text(p.frameId))
        ? {
            type: "place",
            placement: {
              chapterId: p.chapterId,
              frameId: p.frameId as string | null,
            },
          }
        : null;
    }
    case "quiz.advance":
      return text(c.runId) && index >= 0 && STEPS.includes(c.step as QuizStep)
        ? {
            type: "quiz.advance",
            runId: c.runId,
            index,
            step: c.step as QuizStep,
          }
        : null;
    case "quiz.end":
      return text(c.runId) ? { type: "quiz.end", runId: c.runId } : null;
    case "quiz.answer":
      return text(c.runId) &&
        index >= 0 &&
        Array.isArray(c.optionIds) &&
        c.optionIds.length <= 8 &&
        c.optionIds.every((id) => text(id))
        ? {
            type: "quiz.answer",
            runId: c.runId,
            index,
            optionIds: c.optionIds as string[],
          }
        : null;
    case "end":
      return { type: "end" };
    default:
      return null;
  }
}

/** Validates a text frame from a client; null means it is not a message. */
export function parseClientMessage(data: string): ClientMessage | null {
  if (data.length > 4096) {
    return null;
  }
  let input: unknown;
  try {
    input = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof input !== "object" || input === null) {
    return null;
  }
  const message = input as Record<string, unknown>;
  if (message.type === "ping") {
    return { type: "ping" };
  }
  if (message.type === "intent") {
    const intent = parseWireIntent(message.intent);
    return intent ? { type: "intent", intent } : null;
  }
  return null;
}
