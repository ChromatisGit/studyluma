import { describe, expect, test } from "bun:test";
import { createBunRuntimeHost } from "@chromatis/base/stateful/bun";
import { NotFoundError } from "@chromatis/base/errors";
import { createClassroomRuntime } from "../runtime/classroomRuntime";
import {
  createClassroomService,
  LookupRateLimitedError,
} from "./classroomService";
import { createFailureLimiter } from "./rateLimit";

const build = "b".repeat(64);

function setup(options: { now?: () => number; codes?: string[] } = {}) {
  const host = createBunRuntimeHost([
    createClassroomRuntime(
      options.now ? { now: options.now, ttlMs: 1000 } : {},
    ),
  ]);
  const codes = [...(options.codes ?? [])];
  const service = createClassroomService(host, {
    ...(codes.length ? { generateCode: () => codes.shift() ?? "ZZZZ" } : {}),
  });
  return { host, service };
}

describe("creating sessions", () => {
  test("the controller token is unrelated to the join code", async () => {
    const { service } = setup();
    const a = await service.create({ buildId: build, title: "A" });
    const b = await service.create({ buildId: build, title: "B" });
    expect(a.token).not.toBe(b.token);
    expect(a.token.toUpperCase()).not.toContain(a.code);
    expect(a.token.length).toBeGreaterThanOrEqual(43);
  });

  test("a colliding code is replaced by another one", async () => {
    const { service } = setup({ codes: ["AAAA", "AAAA", "CCCC"] });
    expect((await service.create({ buildId: build, title: "1" })).code).toBe(
      "AAAA",
    );
    expect((await service.create({ buildId: build, title: "2" })).code).toBe(
      "CCCC",
    );
  });
});

describe("looking codes up", () => {
  test("unknown, malformed and ended codes fail identically", async () => {
    const { service } = setup();
    const session = await service.create({ buildId: build, title: "x" });
    await service.act(session, { type: "end" });
    const failures: unknown[] = [];
    for (const code of ["QQQQ", "no", session.code]) {
      failures.push(await service.lookup(code, "c1").catch((e: unknown) => e));
    }
    for (const failure of failures) {
      expect(failure).toBeInstanceOf(NotFoundError);
      expect((failure as Error).message).toBe("Unknown session");
    }
  });

  test("a client that keeps guessing is stopped, others are not", async () => {
    const host = createBunRuntimeHost([createClassroomRuntime()]);
    const service = createClassroomService(host, {
      limiter: createFailureLimiter({ maxFailures: 3 }),
    });
    const session = await service.create({ buildId: build, title: "x" });
    for (let i = 0; i < 3; i++) {
      await expect(service.lookup("QQQQ", "guesser")).rejects.toBeInstanceOf(
        NotFoundError,
      );
    }
    await expect(
      service.lookup(session.code, "guesser"),
    ).rejects.toBeInstanceOf(LookupRateLimitedError);
    await expect(service.lookup(session.code, "classmate")).resolves.toBe(
      session.code,
    );
  });

  test("joining the right code repeatedly never counts as guessing", async () => {
    const host = createBunRuntimeHost([createClassroomRuntime()]);
    const service = createClassroomService(host, {
      limiter: createFailureLimiter({ maxFailures: 2 }),
    });
    const session = await service.create({ buildId: build, title: "x" });
    for (let i = 0; i < 10; i++) {
      await service.join(session.code, `S${i}`, "school-router");
    }
  });
});

describe("expiry", () => {
  test("a session ends itself after its time to live and frees the code", async () => {
    let time = 0;
    const { host, service } = setup({ now: () => time });
    const session = await service.create({ buildId: build, title: "x" });
    time = 999;
    await expect(service.snapshot(session)).resolves.toBeDefined();
    time = 1000;
    await expect(service.snapshot(session)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await host.exists({ kind: "classroom", id: session.code })).toBe(
      false,
    );
  });

  test("the sweeper ends sessions nobody touches", async () => {
    let time = 0;
    const { host, service } = setup({ now: () => time });
    const session = await service.create({ buildId: build, title: "x" });
    expect(await service.sweep()).toBe(0);
    time = 5000;
    expect(await service.sweep()).toBe(1);
    expect(await host.exists({ kind: "classroom", id: session.code })).toBe(
      false,
    );
  });
});

describe("participants without accounts", () => {
  test("two students with the same name are different participants", async () => {
    const { service } = setup();
    const session = await service.create({ buildId: build, title: "x" });
    const a = await service.join(session.code, "Alex", "c");
    const b = await service.join(session.code, "Alex", "c");
    expect(a.participantId).not.toBe(b.participantId);
    expect(a.token).not.toBe(b.token);
    const roster = await service.snapshot(session);
    expect(roster.role === "controller" && roster.participants).toHaveLength(2);
  });

  test("an empty name is refused", async () => {
    const { service } = setup();
    const session = await service.create({ buildId: build, title: "x" });
    await expect(service.join(session.code, "  ", "c")).rejects.toThrow();
  });

  test("a student's snapshot never contains other names or the tokens", async () => {
    const { service } = setup();
    const session = await service.create({ buildId: build, title: "x" });
    const a = await service.join(session.code, "Alex", "c");
    await service.join(session.code, "Bea", "c");
    const view = JSON.stringify(await service.snapshot(a));
    expect(view).not.toContain("Bea");
    expect(view).not.toContain(session.token);
  });
});

describe("session registry", () => {
  function registryStub(conflicts: string[] = []) {
    const registered: string[] = [];
    const released: string[] = [];
    return {
      registered,
      released,
      registry: {
        register: (code: string) => {
          if (conflicts.includes(code)) {
            return Promise.resolve("conflict" as const);
          }
          registered.push(code);
          return Promise.resolve("registered" as const);
        },
        release: (code: string) => {
          released.push(code);
          return Promise.resolve();
        },
      },
    };
  }

  test("registers on create, draws again on conflict and releases on end", async () => {
    const stub = registryStub(["AAAA"]);
    const codes = ["AAAA", "CCCC"];
    const service = createClassroomService(
      createBunRuntimeHost([createClassroomRuntime()]),
      { registry: stub.registry, generateCode: () => codes.shift() ?? "ZZZZ" },
    );
    const session = await service.create({ buildId: build, title: "x" });
    expect(session.code).toBe("CCCC");
    expect(stub.registered).toEqual(["CCCC"]);
    // The code the directory refused is free locally again.
    expect(await service.lookup("AAAA", "c1").catch(() => "gone")).toBe("gone");
    await service.act(session, { type: "end" });
    expect(stub.released).toEqual(["CCCC"]);
  });

  test("an unavailable directory does not stop a session", async () => {
    const service = createClassroomService(
      createBunRuntimeHost([createClassroomRuntime()]),
      {
        registry: {
          register: () => Promise.resolve("unavailable"),
          release: () => Promise.resolve(),
        },
      },
    );
    const session = await service.create({ buildId: build, title: "x" });
    expect(await service.lookup(session.code, "c1")).toBe(session.code);
  });
});
