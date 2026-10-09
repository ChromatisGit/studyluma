/**
 * The Classroom Session as pure state transitions. Nothing here knows about
 * Runtime Hosts, sockets, cookies or the clock: the runtime feeds in time
 * and ids and turns the returned events into realtime messages.
 *
 * A session has one Classroom Controller and any number of Participants.
 * Participants exist only inside the session; they never become Users.
 */

import type { SummaryRule } from "../../catalog";
import {
  advanceRun,
  answerRun,
  distribution,
  joinRun,
  leaveRun,
  startRun,
  validQuestions,
  type QuizQuestion,
  type QuizRun,
  type QuizStep,
} from "./quiz";

export const MAX_PARTICIPANTS = 120;
export const MAX_NAME_LENGTH = 40;

export type Placement = { chapterId: string; frameId: string | null };

export type Participant = {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
};

export type Releases = {
  /** Chapters whose Inhalt students may read. */
  summaries: string[];
  /** Tasks whose solution students may read. */
  solutions: string[];
  /** How each chapter's Inhalt opens; default manual. */
  rules: Record<string, SummaryRule>;
};

export type ClassroomSession = {
  code: string;
  /** The compiled content build the lesson runs on. */
  buildId: string;
  /** A Course is optional: sessions run without one. */
  courseId: string | null;
  title: string;
  startedAt: number;
  expiresAt: number;
  status: "open" | "ended";
  placement: Placement | null;
  releases: Releases;
  participants: Participant[];
  quiz: QuizRun | null;
};

export type SessionInit = {
  code: string;
  buildId: string;
  courseId: string | null;
  title: string;
};

export function createSession(
  init: SessionInit,
  now: number,
  ttlMs: number,
): ClassroomSession {
  return {
    ...init,
    startedAt: now,
    expiresAt: now + ttlMs,
    status: "open",
    placement: null,
    releases: { summaries: [], solutions: [], rules: {} },
    participants: [],
    quiz: null,
  };
}

export type Actor =
  { role: "controller" } | { role: "participant"; participantId: string };

export type QuizStart = {
  courseId: string;
  chapterId: string;
  frameId: string;
  title: string;
  questions: QuizQuestion[];
};

/** Everything a client may ask for. */
export type Intent =
  | { type: "place"; placement: Placement | null }
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
  | { type: "end" };

export type ClassroomEvent =
  | { kind: "participant-joined"; participantId: string; name: string }
  | { kind: "participant-left"; participantId: string; name: string }
  | { kind: "placement-changed"; placement: Placement | null }
  | {
      kind: "content-released";
      what: "summary" | "solutions";
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

/** Why an intent was not applied. The runtime maps these to protocol errors. */
export type Rejection =
  "forbidden" | "ended" | "invalid" | "not-found" | "full";

export type Outcome =
  | { ok: true; session: ClassroomSession; events: ClassroomEvent[] }
  | { ok: false; reason: Rejection };

const reject = (reason: Rejection): Outcome => ({ ok: false, reason });

function accept(
  session: ClassroomSession,
  events: ClassroomEvent[] = [],
): Outcome {
  return { ok: true, session, events };
}

function addUnique(list: string[], ids: string[]): string[] {
  return [...new Set([...list, ...ids])];
}

function removeAll(list: string[], ids: string[]): string[] {
  return list.filter((id) => !ids.includes(id));
}

/** Participants currently connected; they are who a quiz waits for. */
export function presentIds(session: ClassroomSession): string[] {
  return session.participants
    .filter((participant) => participant.connected)
    .map((participant) => participant.id);
}

export function cleanName(input: string): string | null {
  const name = input
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return name.length >= 1 && name.length <= MAX_NAME_LENGTH ? name : null;
}

export function addParticipant(
  session: ClassroomSession,
  participant: { id: string; name: string },
  now: number,
): Outcome {
  if (session.status === "ended") {
    return reject("ended");
  }
  if (session.participants.length >= MAX_PARTICIPANTS) {
    return reject("full");
  }
  const name = cleanName(participant.name);
  if (!name) {
    return reject("invalid");
  }
  return accept({
    ...session,
    participants: [
      ...session.participants,
      { id: participant.id, name, connected: false, joinedAt: now },
    ],
  });
}

/** A realtime connection of this participant opened or its last one closed. */
export function setConnected(
  session: ClassroomSession,
  participantId: string,
  connected: boolean,
): Outcome {
  const participant = session.participants.find(
    (item) => item.id === participantId,
  );
  if (!participant) {
    return reject("not-found");
  }
  if (participant.connected === connected) {
    return accept(session);
  }
  const quiz = session.quiz
    ? connected
      ? joinRun(session.quiz, participantId)
      : leaveRun(session.quiz, participantId)
    : null;
  return accept(
    {
      ...session,
      quiz,
      participants: session.participants.map((item) =>
        item.id === participantId ? { ...item, connected } : item,
      ),
    },
    [
      {
        kind: connected ? "participant-joined" : "participant-left",
        participantId,
        name: participant.name,
      },
    ],
  );
}

type ControllerIntent = Exclude<Intent, { type: "quiz.answer" }>;

function release(
  session: ClassroomSession,
  intent: Extract<
    ControllerIntent,
    { type: "release.summary" | "release.rule" | "release.solutions" }
  >,
): Outcome {
  const { releases } = session;
  const change = (next: Partial<Releases>) => ({
    ...session,
    releases: { ...releases, ...next },
  });
  switch (intent.type) {
    case "release.summary":
      return accept(
        change({
          summaries: intent.released
            ? addUnique(releases.summaries, [intent.chapterId])
            : removeAll(releases.summaries, [intent.chapterId]),
        }),
        [
          {
            kind: "content-released",
            what: "summary",
            ids: [intent.chapterId],
            released: intent.released,
          },
        ],
      );
    case "release.rule":
      return accept(
        change({
          rules: { ...releases.rules, [intent.chapterId]: intent.rule },
        }),
      );
    case "release.solutions":
      return accept(
        change({
          solutions: intent.released
            ? addUnique(releases.solutions, intent.taskIds)
            : removeAll(releases.solutions, intent.taskIds),
        }),
        [
          {
            kind: "content-released",
            what: "solutions",
            ids: intent.taskIds,
            released: intent.released,
          },
        ],
      );
  }
}

function startQuiz(
  session: ClassroomSession,
  intent: Extract<ControllerIntent, { type: "quiz.start" }>,
  newRunId: () => string,
): Outcome {
  if (!validQuestions(intent.questions)) {
    return reject("invalid");
  }
  const run = startRun({
    id: newRunId(),
    scope: session.code,
    courseId: intent.courseId,
    chapterId: intent.chapterId,
    frameId: intent.frameId,
    title: intent.title,
    questions: intent.questions,
    present: presentIds(session),
  });
  return accept({ ...session, quiz: run }, [
    { kind: "quiz-started", runId: run.id },
  ]);
}

function advanceQuiz(
  session: ClassroomSession,
  intent: Extract<ControllerIntent, { type: "quiz.advance" }>,
): Outcome {
  const run = session.quiz;
  if (!run || run.id !== intent.runId) {
    return reject("not-found");
  }
  const next = advanceRun(run, intent, presentIds(session));
  const events: ClassroomEvent[] = [];
  if (next !== run && next.step === "revealed") {
    events.push({ kind: "quiz-revealed", runId: run.id, index: next.index });
  }
  if (next !== run && next.ended) {
    events.push({ kind: "quiz-ended", runId: run.id });
  }
  return accept({ ...session, quiz: next }, events);
}

function endQuiz(
  session: ClassroomSession,
  intent: Extract<ControllerIntent, { type: "quiz.end" }>,
): Outcome {
  const run = session.quiz;
  if (!run || run.id !== intent.runId) {
    return reject("not-found");
  }
  if (run.ended) {
    return accept(session);
  }
  return accept({ ...session, quiz: { ...run, ended: true } }, [
    { kind: "quiz-ended", runId: run.id },
  ]);
}

function endSession(session: ClassroomSession): Outcome {
  return accept(
    {
      ...session,
      status: "ended",
      quiz: session.quiz && { ...session.quiz, ended: true },
      participants: session.participants.map((participant) => ({
        ...participant,
        connected: false,
      })),
    },
    [{ kind: "session-ended" }],
  );
}

function controllerIntent(
  session: ClassroomSession,
  intent: ControllerIntent,
  newRunId: () => string,
): Outcome {
  switch (intent.type) {
    case "place":
      return accept({ ...session, placement: intent.placement }, [
        { kind: "placement-changed", placement: intent.placement },
      ]);
    case "release.summary":
    case "release.rule":
    case "release.solutions":
      return release(session, intent);
    case "quiz.start":
      return startQuiz(session, intent, newRunId);
    case "quiz.advance":
      return advanceQuiz(session, intent);
    case "quiz.end":
      return endQuiz(session, intent);
    case "end":
      return endSession(session);
  }
}

function participantIntent(
  session: ClassroomSession,
  participantId: string,
  intent: Extract<Intent, { type: "quiz.answer" }>,
): Outcome {
  const run = session.quiz;
  if (!run || run.id !== intent.runId) {
    return reject("not-found");
  }
  const next = answerRun(run, participantId, intent.index, intent.optionIds);
  if (next === run) {
    return accept(session);
  }
  const { answered, participants } = distribution(next);
  return accept({ ...session, quiz: next }, [
    { kind: "response-submitted", runId: run.id, answered, participants },
  ]);
}

/**
 * Applies a client's intent. Authorization is part of the domain: the
 * controller steers the lesson, a participant can only answer.
 */
export function applyIntent(
  session: ClassroomSession,
  actor: Actor,
  intent: Intent,
  newRunId: () => string,
): Outcome {
  if (session.status === "ended") {
    return reject("ended");
  }
  if (intent.type === "quiz.answer") {
    return actor.role === "participant"
      ? participantIntent(session, actor.participantId, intent)
      : reject("forbidden");
  }
  return actor.role === "controller"
    ? controllerIntent(session, intent, newRunId)
    : reject("forbidden");
}

export function isExpired(session: ClassroomSession, now: number): boolean {
  return session.status === "open" && now >= session.expiresAt;
}
