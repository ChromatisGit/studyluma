/**
 * The Classroom Session as pure state transitions. Nothing here knows about
 * Runtime Hosts, sockets, cookies or the clock: the runtime feeds in time
 * and ids and turns the returned events into realtime messages.
 *
 * A session has one Classroom Controller and any number of Participants.
 * Participants exist only inside the session; they never become Users.
 */

import type { SummaryRule } from "../../catalog";
import type { ClassroomEvent, Intent } from "./intents";
import {
  sheetFits,
  withProgress,
  withRating,
  type AmpelMap,
  type ProgressMap,
} from "./monitoring";
import {
  advanceRun,
  answerRun,
  distribution,
  joinRun,
  leaveRun,
  startRun,
  validQuestions,
  type QuizRun,
} from "./quiz";

/** What a session takes: how many participants, and how long a name may be. */
export type ParticipantLimits = {
  maxParticipants: number;
  maxNameLength: number;
};

export type Placement = { chapterId: string; frameId: string | null };

export type Participant = {
  id: string;
  name: string;
  connected: boolean;
  joinedAt: number;
};

/** The worksheet the teacher sent to the class; students are led to it. */
export type Target = { kind: "sheet"; id: string; chapterId: string };

export type Releases = {
  /** Chapters whose Inhalt students may read. */
  summaries: string[];
  /** The teacher's explicit decision per worksheet; absent: the default applies. */
  sheets: Record<string, boolean>;
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
  /** Students may join with the code; set when the teacher first invites. */
  inviteOpen: boolean;
  /**
   * Since when no teacher connection exists (or when the teacher was last
   * seen, for a teacher without a socket); null while a connection is open.
   */
  controllerAbsentSince: number | null;
  placement: Placement | null;
  /** The sheet sent to the class, if any. */
  target: Target | null;
  releases: Releases;
  participants: Participant[];
  quiz: QuizRun | null;
  /** What each participant reported per worksheet; only totals leave. */
  progress: ProgressMap;
  ampel: AmpelMap;
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
    inviteOpen: false,
    // Nobody has connected yet: the unit ends if the teacher never shows up.
    controllerAbsentSince: now,
    placement: null,
    target: null,
    releases: { summaries: [], sheets: {}, solutions: [], rules: {} },
    participants: [],
    quiz: null,
    progress: {},
    ampel: {},
  };
}

export type Actor =
  { role: "controller" } | { role: "participant"; participantId: string };

export type { ClassroomEvent, Intent, QuizStart } from "./intents";

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

export function cleanName(input: string, maxLength: number): string | null {
  const name = input
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return name.length >= 1 && name.length <= maxLength ? name : null;
}

export function addParticipant(
  session: ClassroomSession,
  participant: { id: string; name: string },
  now: number,
  limits: ParticipantLimits,
): Outcome {
  if (session.status === "ended") {
    return reject("ended");
  }
  // Until the teacher invites, the code finds nobody.
  if (!session.inviteOpen) {
    return reject("not-found");
  }
  if (session.participants.length >= limits.maxParticipants) {
    return reject("full");
  }
  const name = cleanName(participant.name, limits.maxNameLength);
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

type ParticipantIntent = Extract<
  Intent,
  { type: "quiz.answer" | "progress" | "ampel" }
>;
type ControllerIntent = Exclude<Intent, ParticipantIntent>;

function release(
  session: ClassroomSession,
  intent: Extract<
    ControllerIntent,
    {
      type:
        | "release.sheet"
        | "release.summary"
        | "release.rule"
        | "release.solutions";
    }
  >,
): Outcome {
  const { releases } = session;
  const change = (next: Partial<Releases>) => ({
    ...session,
    releases: { ...releases, ...next },
  });
  switch (intent.type) {
    case "release.sheet":
      return accept(
        change({
          sheets: { ...releases.sheets, [intent.sheetId]: intent.released },
        }),
        [
          {
            kind: "content-released",
            what: "sheet",
            ids: [intent.sheetId],
            released: intent.released,
          },
        ],
      );
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
    case "invite":
      return accept(
        session.inviteOpen ? session : { ...session, inviteOpen: true },
      );
    case "place":
      return accept({ ...session, placement: intent.placement }, [
        { kind: "placement-changed", placement: intent.placement },
      ]);
    case "target":
      return accept({ ...session, target: intent.target }, [
        { kind: "target-changed", target: intent.target },
      ]);
    case "release.sheet":
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

function answerQuiz(
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

/** A sheet the teacher locked takes no reports; one never decided on does. */
function reportable(session: ClassroomSession, sheetId: string): boolean {
  return (
    session.releases.sheets[sheetId] !== false &&
    sheetFits([session.progress, session.ampel], sheetId)
  );
}

function reportProgress(
  session: ClassroomSession,
  participantId: string,
  intent: Extract<Intent, { type: "progress" }>,
): Outcome {
  const progress = reportable(session, intent.sheetId)
    ? withProgress(session.progress, participantId, intent)
    : null;
  return progress ? accept({ ...session, progress }) : reject("invalid");
}

function rateAmpel(
  session: ClassroomSession,
  participantId: string,
  intent: Extract<Intent, { type: "ampel" }>,
): Outcome {
  const ampel = reportable(session, intent.sheetId)
    ? withRating(session.ampel, participantId, intent)
    : null;
  return ampel ? accept({ ...session, ampel }) : reject("invalid");
}

function participantIntent(
  session: ClassroomSession,
  participantId: string,
  intent: ParticipantIntent,
): Outcome {
  if (!session.participants.some((item) => item.id === participantId)) {
    return reject("not-found");
  }
  switch (intent.type) {
    case "quiz.answer":
      return answerQuiz(session, participantId, intent);
    case "progress":
      return reportProgress(session, participantId, intent);
    case "ampel":
      return rateAmpel(session, participantId, intent);
  }
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
  if (
    intent.type === "quiz.answer" ||
    intent.type === "progress" ||
    intent.type === "ampel"
  ) {
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
