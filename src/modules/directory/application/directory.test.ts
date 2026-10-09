import { describe, expect, test } from "bun:test";
import {
  createGateway,
  createSessionProbe,
  isInstanceOf,
  type SessionState,
} from "./gateway";
import { createDirectoryRegistry } from "./registryClient";
import {
  RateLimited,
  createSessionDirectory,
  type DirectoryOptions,
} from "../domain/directory";

const normalizeCode = (input: string) =>
  /^[A-Z0-9]{4}$/.test(input.toUpperCase()) ? input.toUpperCase() : null;

function createFailureLimiter(options: { maxFailures?: number } = {}) {
  const max = options.maxFailures ?? 20;
  const failures = new Map<string, number>();
  return {
    allowed: (key: string) => (failures.get(key) ?? 0) < max,
    fail: (key: string) => void failures.set(key, (failures.get(key) ?? 0) + 1),
  };
}

function createDirectory(options: Partial<DirectoryOptions> = {}) {
  return createSessionDirectory({
    normalizeCode,
    limiter: createFailureLimiter(),
    ...options,
  });
}

const A = "https://a.studyluma.org";
const B = "https://b.studyluma.org";

describe("directory", () => {
  test("resolves case-insensitively and rejects another instance's code", () => {
    const directory = createDirectory();
    expect(directory.register({ code: "a3cd", instanceUrl: A })).toBe(
      "registered",
    );
    expect(directory.resolve("A3CD", "c")?.instanceUrl).toBe(A);
    expect(directory.register({ code: "A3CD", instanceUrl: B })).toBe(
      "conflict",
    );
    expect(directory.register({ code: "A3CD", instanceUrl: A })).toBe(
      "registered",
    );
  });

  test("rejects malformed codes and instance addresses", () => {
    const directory = createDirectory();
    expect(directory.register({ code: "no", instanceUrl: A })).toBe("invalid");
    for (const url of [
      "javascript:x",
      "https://u:p@a.studyluma.org",
      `${A}/x`,
    ]) {
      expect(directory.register({ code: "A3CD", instanceUrl: url })).toBe(
        "invalid",
      );
    }
  });

  test("only the holder releases; expired entries vanish and free the code", () => {
    let time = 0;
    const directory = createDirectory({ now: () => time, ttlMs: 100 });
    directory.register({ code: "A3CD", instanceUrl: A });
    expect(directory.release({ code: "A3CD", instanceUrl: B })).toBe(false);
    expect(directory.resolve("A3CD", "c")?.instanceUrl).toBe(A);
    time = 100;
    expect(directory.resolve("A3CD", "c")).toBeNull();
    expect(directory.register({ code: "A3CD", instanceUrl: B })).toBe(
      "registered",
    );
    expect(directory.release({ code: "A3CD", instanceUrl: B })).toBe(true);
    expect(directory.size()).toBe(0);
  });

  test("sweep drops expired entries", () => {
    let time = 0;
    const directory = createDirectory({ now: () => time, ttlMs: 10 });
    directory.register({ code: "A3CD", instanceUrl: A });
    time = 10;
    expect(directory.sweep()).toBe(1);
    expect(directory.size()).toBe(0);
  });

  test("repeated wrong lookups are limited", () => {
    const directory = createDirectory({
      limiter: createFailureLimiter({ maxFailures: 2 }),
    });
    directory.resolve("AAAA", "c");
    directory.resolve("AAAA", "c");
    expect(() => directory.resolve("AAAA", "c")).toThrow(RateLimited);
    expect(directory.resolve("AAAA", "other")).toBeNull();
  });
});

describe("instance addresses", () => {
  test("only https subdomains of the directory's domain", () => {
    expect(isInstanceOf("studyluma.org", "https://holst.studyluma.org")).toBe(
      true,
    );
    for (const url of [
      "https://studyluma.org",
      "http://holst.studyluma.org",
      "https://evilstudyluma.org",
      "https://studyluma.org.evil.example",
      "https://a.b.studyluma.org",
      "https://holst.studyluma.org@evil.example",
      "nope",
    ]) {
      expect(isInstanceOf("studyluma.org", url)).toBe(false);
    }
  });
});

function setup(sessions: Record<string, SessionState> = {}) {
  const directory = createDirectory();
  const state = (instanceUrl: string, code: string): SessionState =>
    sessions[`${instanceUrl}/${code.toUpperCase()}`] ?? "gone";
  const gateway = createGateway(directory, {
    domain: "studyluma.org",
    sessionState: async (instanceUrl, code) => state(instanceUrl, code),
    clientKey: () => "client",
    registrationLimiter: createFailureLimiter({ maxFailures: 5 }),
  });
  const call = (method: string, path: string, body?: unknown) =>
    gateway(
      new Request(`https://studyluma.org${path}`, {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    );
  return { directory, call, sessions };
}

describe("gateway", () => {
  test("redirects a code to the instance's join page", async () => {
    const { call } = setup({ [`${A}/A3CD`]: "live" });
    expect(
      (await call("PUT", "/sessions/A3CD", { instanceUrl: A })).status,
    ).toBe(204);
    const response = await call("GET", "/a3cd");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(`${A}/join/A3CD`);
  });

  test("unknown, malformed and released codes are the same 404", async () => {
    const { call, sessions } = setup({ [`${A}/A3CD`]: "live" });
    await call("PUT", "/sessions/A3CD", { instanceUrl: A });
    sessions[`${A}/A3CD`] = "gone";
    await call("DELETE", "/sessions/A3CD", { instanceUrl: A });
    for (const path of ["/QQQQ", "/nope", "/A3CD", "/a/b"]) {
      expect((await call("GET", path)).status).toBe(404);
    }
  });

  test("a session the instance doesn't run is not registered", async () => {
    const { call } = setup();
    expect(
      (await call("PUT", "/sessions/A3CD", { instanceUrl: A })).status,
    ).toBe(403);
    expect((await call("GET", "/A3CD")).status).toBe(404);
  });

  test("an instance that can't be reached registers nothing and keeps entries", async () => {
    const { call, sessions } = setup({ [`${A}/A3CD`]: "live" });
    await call("PUT", "/sessions/A3CD", { instanceUrl: A });
    sessions[`${A}/A3CD`] = "unknown";
    sessions[`${A}/A4CD`] = "unknown";
    expect(
      (await call("PUT", "/sessions/A4CD", { instanceUrl: A })).status,
    ).toBe(503);
    await call("DELETE", "/sessions/A3CD", { instanceUrl: A });
    expect((await call("GET", "/A3CD")).status).toBe(302);
  });

  test("a live session can't be released by anyone else", async () => {
    const { call } = setup({ [`${A}/A3CD`]: "live" });
    await call("PUT", "/sessions/A3CD", { instanceUrl: A });
    await call("DELETE", "/sessions/A3CD", { instanceUrl: A });
    await call("DELETE", "/sessions/A3CD", { instanceUrl: B });
    expect((await call("GET", "/A3CD")).status).toBe(302);
  });

  test("addresses outside the domain are rejected without a request", async () => {
    const { call } = setup({ "https://evil.example/A3CD": "live" });
    for (const url of ["https://evil.example", "http://a.studyluma.org", "x"]) {
      expect(
        (await call("PUT", "/sessions/A3CD", { instanceUrl: url })).status,
      ).toBe(400);
    }
  });

  test("another instance's live code is a conflict", async () => {
    const { call } = setup({ [`${A}/A3CD`]: "live", [`${B}/A3CD`]: "live" });
    await call("PUT", "/sessions/A3CD", { instanceUrl: A });
    expect(
      (await call("PUT", "/sessions/A3CD", { instanceUrl: B })).status,
    ).toBe(409);
  });

  test("registration attempts are rate-limited with 429", async () => {
    const { call } = setup();
    for (let i = 0; i < 5; i++) {
      await call("PUT", "/sessions/A3CD", { instanceUrl: A });
    }
    expect(
      (await call("PUT", "/sessions/A3CD", { instanceUrl: A })).status,
    ).toBe(429);
  });

  test("lookups are rate-limited with 429", async () => {
    const directory = createDirectory({
      limiter: createFailureLimiter({ maxFailures: 1 }),
    });
    const gateway = createGateway(directory, {
      domain: "studyluma.org",
      sessionState: async () => "gone",
      clientKey: () => "c",
    });
    const get = () => gateway(new Request("https://studyluma.org/AAAA"));
    expect((await get()).status).toBe(404);
    expect((await get()).status).toBe(429);
  });
});

describe("session probe", () => {
  test("maps the instance's answer and never follows redirects", async () => {
    const answer = (status: number) =>
      createSessionProbe(
        (async () => new Response(null, { status })) as unknown as typeof fetch,
      );
    expect(await answer(204)("https://a.studyluma.org", "A3CD")).toBe("live");
    expect(await answer(404)("https://a.studyluma.org", "A3CD")).toBe("gone");
    expect(await answer(302)("https://a.studyluma.org", "A3CD")).toBe(
      "unknown",
    );
    expect(await answer(429)("https://a.studyluma.org", "A3CD")).toBe(
      "unknown",
    );
    let requested = "";
    let init: RequestInit | undefined;
    await createSessionProbe((async (url: string, options: RequestInit) => {
      requested = url;
      init = options;
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch)("https://a.studyluma.org", "A3CD");
    expect(requested).toBe(
      "https://a.studyluma.org/.well-known/studyluma-session/A3CD",
    );
    expect(init?.redirect).toBe("manual");
    const offline = createSessionProbe((() =>
      Promise.reject(new Error("offline"))) as unknown as typeof fetch);
    expect(await offline("https://a.studyluma.org", "A3CD")).toBe("unknown");
  });
});

describe("registry client with a directory", () => {
  test("talks to the gateway and reports conflicts and outages", async () => {
    const live = new Set([`${A}/A3CD`, `${B}/A3CD`]);
    const gateway = createGateway(createDirectory(), {
      domain: "studyluma.org",
      sessionState: async (url, code) =>
        live.has(`${url}/${code}`) ? "live" : "gone",
      clientKey: () => "c",
    });
    const fetcher = ((url: string, init: RequestInit) =>
      gateway(new Request(url, init))) as unknown as typeof fetch;
    const mine = createDirectoryRegistry(
      { directoryUrl: "https://studyluma.org", instanceUrl: A },
      fetcher,
    );
    const other = createDirectoryRegistry(
      { directoryUrl: "https://studyluma.org", instanceUrl: B },
      fetcher,
    );
    expect(await mine.register("A3CD")).toBe("registered");
    expect(await other.register("A3CD")).toBe("conflict");
    live.delete(`${A}/A3CD`);
    await mine.release("A3CD");
    expect(await other.register("A3CD")).toBe("registered");

    const down = createDirectoryRegistry(
      { directoryUrl: "https://down.invalid", instanceUrl: A },
      (() => Promise.reject(new Error("offline"))) as unknown as typeof fetch,
    );
    expect(await down.register("A3CD")).toBe("unavailable");
    await down.release("A3CD");
  });
});
