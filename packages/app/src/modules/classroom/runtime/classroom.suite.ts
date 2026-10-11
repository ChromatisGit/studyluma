import { expect, test } from "bun:test";
import type { StatefulRuntime } from "@chromatis/base/stateful";
import type { createClassroomService } from "../application/classroomService";
import type { ClassroomAuth } from "../application/classroomService";
import type { ServerMessage } from "../domain/protocol";
import type { ClassroomEvent, QuizStart } from "../domain/session";

/** A realtime client as the browser sees it, on either host. */
export interface TestClient {
  send(message: unknown): void;
  close(): void;
  readonly messages: ServerMessage[];
  /** Resolves once the server has closed the connection. */
  untilClosed(): Promise<void>;
  /** Resolves with the first message (old or new) matching the predicate. */
  until(predicate: (message: ServerMessage) => boolean): Promise<ServerMessage>;
}

export type Service = ReturnType<typeof createClassroomService>;

export interface ClassroomHarness {
  /** Enough of the Runtime Host to see whether an address exists. */
  runtime: Pick<StatefulRuntime, "exists">;
  /** The Classroom Service as this target's server entry would hold it. */
  service: Service;
  /** Connects like the Website's socket route: credential in the cookie. */
  open(auth: ClassroomAuth): Promise<TestClient>;
  dispose(): Promise<void>;
}

/** The Cookie header a browser holding this credential would send. */
export const cookieOf = (auth: ClassroomAuth) =>
  `studyluma-classroom=${auth.code}.${auth.token}`;

export type SocketLike = {
  send(data: string): void;
  close(): void;
  addEventListener(
    type: "message" | "close",
    listener: (event: { data?: unknown }) => void,
  ): void;
};

export function wrapSocket(socket: SocketLike): TestClient {
  const messages: ServerMessage[] = [];
  const waiting: (() => void)[] = [];
  let closed = false;
  socket.addEventListener("message", (event) => {
    messages.push(JSON.parse(String(event.data)) as ServerMessage);
    waiting.splice(0).forEach((wake) => wake());
  });
  socket.addEventListener("close", () => {
    closed = true;
    waiting.splice(0).forEach((wake) => wake());
  });
  return {
    async untilClosed() {
      const deadline = Date.now() + 2000;
      while (!closed) {
        if (Date.now() > deadline) {
          throw new Error("The connection stayed open");
        }
        await new Promise<void>((resolve) => {
          waiting.push(resolve);
          setTimeout(resolve, 50);
        });
      }
    },
    messages,
    send: (message) => socket.send(JSON.stringify(message)),
    close: () => socket.close(),
    async until(predicate) {
      const deadline = Date.now() + 2000;
      for (;;) {
        const found = messages.find(predicate);
        if (found) {
          return found;
        }
        if (Date.now() > deadline) {
          throw new Error(
            `Timed out; got ${JSON.stringify(messages.map((m) => m.type))}`,
          );
        }
        await new Promise<void>((resolve) => {
          waiting.push(resolve);
          setTimeout(resolve, 50);
        });
      }
    },
  };
}

const inline = (value: string) => [{ type: "text" as const, value }];
const quizStart: QuizStart = {
  courseId: "mathe",
  chapterId: "c1",
  frameId: "f1",
  title: "Quiz",
  questions: [
    {
      content: [{ type: "paragraph", children: inline("Frage?") }],
      multiple: false,
      options: [
        { id: "a", content: inline("A"), correct: true },
        { id: "b", content: inline("B"), correct: false },
      ],
    },
  ],
};

const snapshots = (client: TestClient) =>
  client.messages.flatMap((m) => (m.type === "snapshot" ? [m.snapshot] : []));
const events = (client: TestClient) =>
  client.messages.flatMap((m) => (m.type === "event" ? [m.event] : []));
const kinds = (list: ClassroomEvent[]) => list.map((event) => event.kind);

type Scenario = (ctx: {
  harness: ClassroomHarness;
  service: Service;
  controller: ClassroomAuth;
}) => Promise<void>;

const joinsScenario: Scenario = async (ctx) => {
  const { harness, service, controller } = ctx;
  const teacher = await harness.open(controller);
  await teacher.until((m) => m.type === "snapshot");

  const joined = await service.join(controller.code.toLowerCase(), "Ada", "c1");
  expect(joined.token).not.toBe(controller.token);
  expect(joined.token).not.toContain(controller.code);

  const student = await harness.open(joined);
  const first = await student.until((m) => m.type === "snapshot");
  expect(first).toMatchObject({
    snapshot: { role: "participant", you: { name: "Ada" } },
  });
  await teacher.until(
    (m) => m.type === "event" && m.event.kind === "participant-joined",
  );
  const roster = snapshots(teacher).at(-1);
  expect(roster).toMatchObject({
    role: "controller",
    participants: [{ name: "Ada", connected: true }],
  });

  student.close();
  await teacher.until(
    (m) => m.type === "event" && m.event.kind === "participant-left",
  );

  const again = await harness.open(joined);
  await again.until((m) => m.type === "snapshot");
  const sameId = snapshots(again)[0];
  expect(sameId).toMatchObject({
    you: { id: joined.participantId, name: "Ada" },
  });
  again.close();
  teacher.close();
};

const steersScenario: Scenario = async (ctx) => {
  const { harness, service, controller } = ctx;
  const joined = await service.join(controller.code, "Ben", "c1");
  const student = await harness.open(joined);
  await student.until((m) => m.type === "snapshot");
  student.send({
    type: "intent",
    intent: {
      type: "place",
      placement: { chapterId: "c1", frameId: null },
    },
  });
  await student.until((m) => m.type === "error");
  expect(
    student.messages.some(
      (m) => m.type === "error" && m.reason === "forbidden",
    ),
  ).toBe(true);

  await expect(
    service.act(
      { code: controller.code, token: joined.token },
      { type: "end" },
    ),
  ).rejects.toThrow();
  await expect(
    service.snapshot({ code: controller.code, token: "nope" }),
  ).rejects.toThrow();
  // No usable credential: no connection at all.
  await expect(
    harness.open({ code: controller.code, token: "nope" }),
  ).rejects.toThrow();
  // A well-formed but wrong token is accepted by the route and then refused
  // by the session, which closes the connection.
  const forged = await harness.open({
    code: controller.code,
    token: "x".repeat(43),
  });
  await forged.untilClosed();
  expect(forged.messages).toEqual([]);
  student.close();
};

const releasesScenario: Scenario = async (ctx) => {
  const { harness, service, controller } = ctx;
  const joined = await service.join(controller.code, "Cleo", "c1");
  const student = await harness.open(joined);
  await student.until((m) => m.type === "snapshot");

  await service.act(controller, {
    type: "place",
    placement: { chapterId: "c1", frameId: "f2" },
  });
  await service.act(controller, {
    type: "release.summary",
    chapterId: "c1",
    released: true,
  });
  await service.act(controller, {
    type: "release.solutions",
    taskIds: ["t1", "t2"],
    released: true,
  });
  await student.until(
    (m) => m.type === "snapshot" && m.snapshot.releases.solutions.length === 2,
  );
  const last = snapshots(student).at(-1);
  expect(last).toMatchObject({
    placement: { chapterId: "c1", frameId: "f2" },
    releases: { summaries: ["c1"], solutions: ["t1", "t2"] },
  });
  expect(kinds(events(student))).toEqual(
    expect.arrayContaining(["placement-changed", "content-released"]),
  );

  const viaToken = await service.snapshot(joined);
  expect(viaToken.releases.summaries).toEqual(["c1"]);
  student.close();
};

const quizScenario: Scenario = async (ctx) => {
  const { harness, service, controller } = ctx;
  const teacher = await harness.open(controller);
  const joined = await service.join(controller.code, "Dana", "c1");
  const student = await harness.open(joined);
  await student.until((m) => m.type === "snapshot");

  await service.act(controller, { type: "quiz.start", ...quizStart });
  const started = await student.until(
    (m) => m.type === "snapshot" && m.snapshot.quiz !== null,
  );
  const run = started.type === "snapshot" ? started.snapshot.quiz : null;
  if (!run) {
    throw new Error("The quiz did not start");
  }
  expect(run.step).toBe("answering");
  expect(JSON.stringify(run)).not.toContain('"correct":true');

  student.send({
    type: "intent",
    intent: {
      type: "quiz.answer",
      runId: run.runId,
      index: 0,
      optionIds: ["a"],
    },
  });
  await teacher.until(
    (m) => m.type === "event" && m.event.kind === "response-submitted",
  );
  expect(kinds(events(student))).not.toContain("response-submitted");
  const counted = snapshots(teacher).at(-1);
  expect(counted).toMatchObject({
    quiz: { distribution: { answered: 1, participants: 1 }, ready: true },
  });

  teacher.send({
    type: "intent",
    intent: {
      type: "quiz.advance",
      runId: run.runId,
      index: 0,
      step: "answering",
    },
  });
  teacher.send({
    type: "intent",
    intent: {
      type: "quiz.advance",
      runId: run.runId,
      index: 0,
      step: "distribution",
    },
  });
  const revealed = await student.until(
    (m) => m.type === "snapshot" && m.snapshot.quiz?.step === "revealed",
  );
  expect(JSON.stringify(revealed)).toContain('"correct":true');
  expect(JSON.stringify(revealed)).toContain('"answer":["a"]');
  await student.until(
    (m) => m.type === "event" && m.event.kind === "quiz-revealed",
  );
  teacher.close();
  student.close();
};

const endsScenario: Scenario = async (ctx) => {
  const { harness, service, controller } = ctx;
  const joined = await service.join(controller.code, "Eli", "c1");
  const student = await harness.open(joined);
  await student.until((m) => m.type === "snapshot");

  await service.act(controller, { type: "end" });
  await student.until(
    (m) => m.type === "event" && m.event.kind === "session-ended",
  );
  expect(
    await harness.runtime.exists({
      kind: "classroom",
      id: controller.code,
    }),
  ).toBe(false);
  await expect(service.join(controller.code, "Late", "c2")).rejects.toThrow();
  await expect(service.snapshot(joined)).rejects.toThrow();
};

const malformedScenario: Scenario = async (ctx) => {
  const { harness, controller } = ctx;
  const teacher = await harness.open(controller);
  await teacher.until((m) => m.type === "snapshot");
  teacher.send("not an object");
  await teacher.until((m) => m.type === "error");
  teacher.send({ type: "ping" });
  await teacher.until((m) => m.type === "pong");
  teacher.close();
};

const scenarios: [string, Scenario][] = [
  [
    "students join without accounts and reconnect with their token",
    joinsScenario,
  ],
  [
    "only the controller steers; a participant token is refused",
    steersScenario,
  ],
  ["lesson position and released content reach everyone", releasesScenario],
  ["live quiz from start to reveal keeps answers private", quizScenario],
  ["ending the session closes it and frees the join code", endsScenario],
  ["malformed frames are answered, not fatal", malformedScenario],
];

/**
 * The Classroom behavior, written once and run against every Runtime Host:
 * the same domain logic must behave identically on Bun and on Cloudflare.
 */
export function runClassroomSuite(
  name: string,
  create: () => Promise<ClassroomHarness>,
) {
  for (const [title, scenario] of scenarios) {
    test(`${name}: ${title}`, async () => {
      const harness = await create();
      try {
        const { service } = harness;
        const controller = await service.create({
          buildId: "b".repeat(64),
          courseId: "mathe",
          title: "Mathe 8a",
        });
        await scenario({ harness, service, controller });
      } finally {
        await harness.dispose();
      }
    });
  }
}
