import { describe, expect, test } from "bun:test";
import {
  generateJoinCode,
  JOIN_CODE_ALPHABET,
  normalizeJoinCode,
} from "./joinCode";
import {
  addParticipant,
  applyIntent,
  cleanName,
  createSession,
  isExpired,
  MAX_PARTICIPANTS,
  setConnected,
  type ClassroomSession,
  type Intent,
  type Outcome,
} from "./session";
import type { QuizQuestion } from "./quiz";

const controller = { role: "controller" } as const;
const ids = () => "run-1";
const text = (value: string) => [{ type: "text" as const, value }];
const question: QuizQuestion = {
  content: [{ type: "paragraph", children: text("?") }],
  multiple: false,
  options: [
    { id: "a", content: text("A"), correct: true },
    { id: "b", content: text("B"), correct: false },
  ],
};

function fresh(): ClassroomSession {
  return createSession(
    { code: "ABCD", buildId: "b", courseId: null, title: "T" },
    1000,
    5000,
  );
}

function ok(outcome: Outcome): ClassroomSession {
  if (!outcome.ok) {
    throw new Error(`rejected: ${outcome.reason}`);
  }
  return outcome.session;
}

function joined(session: ClassroomSession, id: string, name = id) {
  return ok(addParticipant(session, { id, name }, 2000));
}

describe("join codes", () => {
  test("have four characters from an unambiguous alphabet", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(4);
      expect([...code].every((c) => JOIN_CODE_ALPHABET.includes(c))).toBe(true);
    }
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[01OIL5S8B2Z]/);
  });

  test("draw every character uniformly (rejection sampling)", () => {
    // bytes 0..24 repeated; 250..255 must be rejected, not wrapped around
    const bytes = [250, 251, 252, 253, 254, 255, 0, 1, 2, 3, 4, 5];
    let used = false;
    const code = generateJoinCode((buffer) => {
      buffer.fill(0);
      if (!used) {
        used = true;
        bytes.forEach((byte, i) => (buffer[i] = byte));
      }
    });
    expect(code).toBe([0, 1, 2, 3].map((n) => JOIN_CODE_ALPHABET[n]).join(""));
  });

  test("are case-insensitive and reject anything else", () => {
    expect(normalizeJoinCode(" ac3d ")).toBe("AC3D");
    expect(normalizeJoinCode("abc")).toBeNull();
    expect(normalizeJoinCode("abcde")).toBeNull();
    expect(normalizeJoinCode("AB0D")).toBeNull();
  });
});

describe("participants", () => {
  test("names are cleaned and bounded", () => {
    expect(cleanName("  Ada \n  Lovelace\u0000 ")).toBe("Ada Lovelace");
    expect(cleanName("   ")).toBeNull();
    expect(cleanName("x".repeat(41))).toBeNull();
  });

  test("a full session takes no more participants", () => {
    let session = fresh();
    for (let i = 0; i < MAX_PARTICIPANTS; i++) {
      session = joined(session, `p${i}`);
    }
    expect(addParticipant(session, { id: "late", name: "Late" }, 3000)).toEqual(
      {
        ok: false,
        reason: "full",
      },
    );
  });

  test("connecting and leaving is reported once", () => {
    const session = joined(fresh(), "p1", "Ada");
    const on = setConnected(session, "p1", true);
    expect(on.ok && on.events).toEqual([
      { kind: "participant-joined", participantId: "p1", name: "Ada" },
    ]);
    const again = setConnected(ok(on), "p1", true);
    expect(again.ok && again.events).toEqual([]);
    expect(setConnected(session, "nobody", true)).toEqual({
      ok: false,
      reason: "not-found",
    });
  });
});

describe("authorization", () => {
  test("a participant cannot steer, the controller cannot answer", () => {
    const session = joined(fresh(), "p1");
    const steer: Intent[] = [
      { type: "end" },
      { type: "place", placement: null },
      { type: "release.summary", chapterId: "c", released: true },
    ];
    for (const intent of steer) {
      expect(
        applyIntent(
          session,
          { role: "participant", participantId: "p1" },
          intent,
          ids,
        ),
      ).toEqual({ ok: false, reason: "forbidden" });
    }
    expect(
      applyIntent(
        session,
        controller,
        { type: "quiz.answer", runId: "r", index: 0, optionIds: ["a"] },
        ids,
      ),
    ).toEqual({ ok: false, reason: "forbidden" });
  });

  test("an ended session accepts nothing", () => {
    const ended = ok(applyIntent(fresh(), controller, { type: "end" }, ids));
    expect(
      applyIntent(ended, controller, { type: "place", placement: null }, ids),
    ).toEqual({ ok: false, reason: "ended" });
    expect(addParticipant(ended, { id: "p", name: "P" }, 1)).toEqual({
      ok: false,
      reason: "ended",
    });
  });
});

describe("released content", () => {
  test("releasing and locking are idempotent and independent", () => {
    let session = fresh();
    const release = (intent: Intent) =>
      (session = ok(applyIntent(session, controller, intent, ids)));
    release({ type: "release.summary", chapterId: "c1", released: true });
    release({ type: "release.summary", chapterId: "c1", released: true });
    release({
      type: "release.solutions",
      taskIds: ["t1", "t2"],
      released: true,
    });
    release({ type: "release.solutions", taskIds: ["t1"], released: false });
    release({ type: "release.rule", chapterId: "c1", rule: "abschluss" });
    expect(session.releases).toEqual({
      summaries: ["c1"],
      solutions: ["t2"],
      rules: { c1: "abschluss" },
    });
  });
});

describe("quiz inside the session", () => {
  const start: Intent = {
    type: "quiz.start",
    courseId: "m",
    chapterId: "c",
    frameId: "f",
    title: "Q",
    questions: [question],
  };

  test("waits for connected participants only", () => {
    let session = joined(joined(fresh(), "p1"), "p2");
    session = ok(setConnected(session, "p1", true));
    session = ok(applyIntent(session, controller, start, ids));
    expect(session.quiz?.participants[0]).toEqual(["p1"]);
  });

  test("rejects a quiz nobody can answer", () => {
    expect(
      applyIntent(
        fresh(),
        controller,
        { ...start, questions: [] } as Intent,
        ids,
      ),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  test("a stale advance does not skip a step", () => {
    let session = ok(
      applyIntent(joined(fresh(), "p1"), controller, start, ids),
    );
    const advance: Intent = {
      type: "quiz.advance",
      runId: "run-1",
      index: 0,
      step: "answering",
    };
    session = ok(applyIntent(session, controller, advance, ids));
    session = ok(applyIntent(session, controller, advance, ids));
    expect(session.quiz?.step).toBe("distribution");
  });
});

describe("expiry", () => {
  test("a session expires at its time to live", () => {
    const session = fresh();
    expect(isExpired(session, 5999)).toBe(false);
    expect(isExpired(session, 6000)).toBe(true);
  });
});
