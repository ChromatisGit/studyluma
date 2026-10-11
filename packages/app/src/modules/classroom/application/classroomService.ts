import { AppError, ConflictError, NotFoundError } from "@chromatis/base/errors";
import type { RuntimeJson, StatefulRuntime } from "@chromatis/base/stateful";
import { generateJoinCode, normalizeJoinCode } from "../domain/joinCode";
import type { Snapshot } from "../domain/protocol";
import type { Intent } from "../domain/session";
import {
  CLASSROOM_KIND,
  type ClassroomCommand,
  type ClassroomRuntimeInit,
  type JoinResult,
} from "../runtime/classroomRuntime";
import { createFailureLimiter, type FailureLimiter } from "./rateLimit";

/** A caller proved who they are with a token handed out by the session. */
export type ClassroomAuth = { code: string; token: string };

/** Too many wrong codes from one client. */
export class LookupRateLimitedError extends AppError {
  constructor() {
    super("Too many attempts", RATE_LIMITED);
  }
}

/** Matched by code, not class: a server entry and the bundled app can hold separate copies of this module. */
export const RATE_LIMITED = "rate_limited";

/**
 * Where an instance announces its sessions so a short address can find
 * them (the Session Directory). Optional: a session never depends on it.
 */
export type SessionRegistry = {
  /** `conflict`: another instance holds the code, draw a different one. */
  register(code: string): Promise<"registered" | "conflict" | "unavailable">;
  release(code: string): Promise<void>;
};

export type CreatedSession = ClassroomAuth & { controllerToken: string };

export type ClassroomService = {
  /** Starts a session; the creator becomes its Classroom Controller. */
  create(input: {
    buildId: string;
    courseId?: string | null;
    title: string;
  }): Promise<ClassroomAuth>;
  /**
   * Looks a join code up. Unknown, ended and expired codes all fail the
   * same way, so a code never reveals that a session once existed.
   */
  lookup(code: string, client: string): Promise<string>;
  join(
    code: string,
    name: string,
    client: string,
  ): Promise<ClassroomAuth & { participantId: string }>;
  snapshot(auth: ClassroomAuth): Promise<Snapshot>;
  /** Applies an intent for the token's holder and returns their snapshot. */
  act(auth: ClassroomAuth, intent: Intent): Promise<Snapshot>;
  /** Upgrades a request to the realtime connection of the token's holder. */
  connect(auth: ClassroomAuth, request: Request): Promise<Response | undefined>;
  /** Ends the sessions that outlived their time to live. */
  sweep(): Promise<number>;
};

export type ClassroomServiceOptions = {
  limiter?: FailureLimiter;
  generateCode?: () => string;
  registry?: SessionRegistry;
};

const MAX_CODE_ATTEMPTS = 50;

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

type Deps = {
  runtime: StatefulRuntime;
  limiter: FailureLimiter;
  generateCode: () => string;
  registry: SessionRegistry | undefined;
  /** Codes this process created; the sweeper's list of sessions to check. */
  known: Set<string>;
};

const address = (code: string) => ({ kind: CLASSROOM_KIND, id: code });

const send = (deps: Deps, code: string, body: ClassroomCommand) =>
  deps.runtime.command(address(code), body as unknown as RuntimeJson);

async function resolve(
  deps: Deps,
  code: string,
  client: string,
): Promise<string> {
  if (!deps.limiter.allowed(client)) {
    throw new LookupRateLimitedError();
  }
  const normalized = normalizeJoinCode(code);
  if (!normalized || !(await deps.runtime.exists(address(normalized)))) {
    deps.limiter.fail(client);
    throw new NotFoundError("Unknown session");
  }
  return normalized;
}

async function createSession(
  deps: Deps,
  input: Parameters<ClassroomService["create"]>[0],
): Promise<ClassroomAuth> {
  const controllerToken = randomSecret();
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = deps.generateCode();
    const init: ClassroomRuntimeInit = {
      code,
      buildId: input.buildId,
      courseId: input.courseId ?? null,
      title: input.title,
      controllerToken,
    };
    try {
      await deps.runtime.create(address(code), init as unknown as RuntimeJson);
    } catch (error) {
      if (error instanceof ConflictError) {
        continue; // taken: draw another code
      }
      throw error;
    }
    if ((await deps.registry?.register(code)) === "conflict") {
      // Free here, taken elsewhere: undo and draw another code.
      await send(deps, code, {
        type: "act",
        token: controllerToken,
        intent: { type: "end" },
      });
      continue;
    }
    deps.known.add(code);
    return { code, token: controllerToken };
  }
  throw new ConflictError("No free join code");
}

async function sweep(deps: Deps): Promise<number> {
  let ended = 0;
  for (const code of [...deps.known]) {
    try {
      if ((await send(deps, code, { type: "expire" })) === true) {
        deps.known.delete(code);
        await deps.registry?.release(code);
        ended += 1;
      }
    } catch (error) {
      if (!(error instanceof NotFoundError)) {
        throw error;
      }
      deps.known.delete(code);
      await deps.registry?.release(code);
    }
  }
  return ended;
}

export function createClassroomService(
  runtime: StatefulRuntime,
  options: ClassroomServiceOptions = {},
): ClassroomService {
  const deps: Deps = {
    runtime,
    limiter: options.limiter ?? createFailureLimiter(),
    generateCode: options.generateCode ?? (() => generateJoinCode()),
    registry: options.registry,
    known: new Set(),
  };
  return {
    create: (input) => createSession(deps, input),
    lookup: (code, client) => resolve(deps, code, client),

    async join(code, name, client) {
      const normalized = await resolve(deps, code, client);
      try {
        const joined = (await send(deps, normalized, {
          type: "join",
          name,
        })) as JoinResult;
        return {
          code: normalized,
          token: joined.token,
          participantId: joined.participantId,
        };
      } catch (error) {
        if (error instanceof NotFoundError) {
          deps.limiter.fail(client);
        }
        throw error;
      }
    },

    async snapshot(auth) {
      return (await send(deps, auth.code, {
        type: "snapshot",
        token: auth.token,
      })) as unknown as Snapshot;
    },

    async act(auth, intent) {
      const snapshot = (await send(deps, auth.code, {
        type: "act",
        token: auth.token,
        intent,
      })) as unknown as Snapshot;
      if (intent.type === "end") {
        deps.known.delete(auth.code);
        await deps.registry?.release(auth.code);
      }
      return snapshot;
    },

    connect(auth, request) {
      // The token reaches the session as a trusted connection parameter:
      // set here from the cookie, never from the browser's URL.
      return runtime.connect(address(auth.code), request, {
        token: auth.token,
      });
    },

    sweep: () => sweep(deps),
  };
}
