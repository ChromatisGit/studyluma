import { describe, expect, test } from "bun:test";
import {
  addParticipant,
  applyIntent,
  createSession,
  setConnected,
  type ClassroomSession,
  type Intent,
  type Outcome,
} from "./session";
import { controllerSnapshot, participantSnapshot } from "./protocol";
import { MAX_SHEETS } from "./monitoring";

const limits = { maxParticipants: 120, maxNameLength: 40 };
const controller = { role: "controller" } as const;
const ids = () => "run-1";

function ok(outcome: Outcome): ClassroomSession {
  if (!outcome.ok) {
    throw new Error(`rejected: ${outcome.reason}`);
  }
  return outcome.session;
}

/** A session with the named participants, all connected. */
function sessionWith(...names: string[]): ClassroomSession {
  let session = {
    ...createSession(
      { code: "ABCD", buildId: "b", courseId: null, title: "T" },
      1000,
      5000,
    ),
    inviteOpen: true,
  };
  for (const id of names) {
    session = ok(addParticipant(session, { id, name: id }, 2000, limits));
    session = ok(setConnected(session, id, true));
  }
  return session;
}

const as = (participantId: string) =>
  ({ role: "participant", participantId }) as const;

function act(session: ClassroomSession, id: string, intent: Intent) {
  return applyIntent(session, as(id), intent, ids);
}

const progress = (sheetId: string, reached: number, done = false) =>
  ({ type: "progress", sheetId, reached, done, challenges: false }) as const;

const totalsOf = (session: ClassroomSession, sheetId: string) => {
  const snapshot = controllerSnapshot(session);
  return snapshot.monitoring[sheetId];
};

describe("worksheet progress", () => {
  test("totals count sections, working and done per sheet", () => {
    let session = sessionWith("a", "b", "c");
    session = ok(act(session, "a", progress("s1", 0)));
    session = ok(act(session, "b", progress("s1", 2)));
    session = ok(act(session, "c", progress("s1", 2, true)));
    expect(totalsOf(session, "s1")).toMatchObject({
      working: 2,
      done: 1,
      reached: [1, 0, 2],
    });
  });

  test("a report only moves forward", () => {
    let session = sessionWith("a");
    session = ok(act(session, "a", progress("s1", 3, true)));
    session = ok(act(session, "a", progress("s1", 1, false)));
    expect(totalsOf(session, "s1")).toMatchObject({
      done: 1,
      reached: [0, 0, 0, 1],
    });
  });

  test("a participant who left no longer counts as working", () => {
    let session = sessionWith("a", "b");
    session = ok(act(session, "a", progress("s1", 0)));
    session = ok(act(session, "b", progress("s1", 0)));
    session = ok(setConnected(session, "b", false));
    expect(totalsOf(session, "s1")?.working).toBe(1);
  });

  test("a locked sheet takes no reports", () => {
    let session = sessionWith("a");
    session = ok(
      applyIntent(
        session,
        controller,
        { type: "release.sheet", sheetId: "s1", released: false },
        ids,
      ),
    );
    expect(act(session, "a", progress("s1", 0))).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  test("bad sections and too many sheets are refused", () => {
    let session = sessionWith("a");
    for (const reached of [-1, 100, 1.5]) {
      expect(act(session, "a", progress("s1", reached)).ok).toBe(false);
    }
    for (let i = 0; i < MAX_SHEETS; i++) {
      session = ok(act(session, "a", progress(`s${i}`, 0)));
    }
    expect(act(session, "a", progress("one-too-many", 0)).ok).toBe(false);
    expect(act(session, "a", progress("s0", 1)).ok).toBe(true);
  });

  test("only participants report, and only known ones", () => {
    const session = sessionWith("a");
    expect(applyIntent(session, controller, progress("s1", 0), ids)).toEqual({
      ok: false,
      reason: "forbidden",
    });
    expect(act(session, "ghost", progress("s1", 0))).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("Ampel", () => {
  const rate = (
    sheetId: string,
    level: "green" | "yellow" | "red",
    causes: (
      "topic" | "task" | "approach" | "execution" | "mistake" | "other"
    )[] = [],
  ) => ({ type: "ampel", sheetId, level, causes }) as const;

  test("totals count levels and causes; a new rating replaces the old", () => {
    let session = sessionWith("a", "b", "c");
    session = ok(act(session, "a", rate("s1", "green")));
    session = ok(act(session, "b", rate("s1", "yellow", ["task", "topic"])));
    session = ok(act(session, "c", rate("s1", "red", ["task"])));
    session = ok(act(session, "c", rate("s1", "green")));
    expect(totalsOf(session, "s1")?.ampel).toEqual({
      answered: 3,
      levels: { green: 2, yellow: 1, red: 0 },
      causes: { task: 1, topic: 1 },
    });
  });

  test("yellow and red need a cause, green keeps none", () => {
    let session = sessionWith("a");
    expect(act(session, "a", rate("s1", "yellow")).ok).toBe(false);
    session = ok(act(session, "a", rate("s1", "green", ["task"])));
    expect(totalsOf(session, "s1")?.ampel.causes).toEqual({});
  });

  test("the snapshots show totals only, never who rated what", () => {
    let session = sessionWith("anna", "ben");
    session = ok(act(session, "anna", rate("s1", "red", ["task"])));
    session = ok(act(session, "ben", progress("s1", 1)));
    const teacher = JSON.stringify(controllerSnapshot(session).monitoring);
    expect(teacher).not.toContain("anna");
    expect(teacher).not.toContain("ben");
    const student = participantSnapshot(session, "ben", 0);
    expect(JSON.stringify(student)).not.toContain('"red"');
    expect(JSON.stringify(student)).not.toContain("monitoring");
  });
});
