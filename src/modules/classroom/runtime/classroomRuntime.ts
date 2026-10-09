import {
  ConflictError,
  NotFoundError,
  PermissionDeniedError,
  ValidationError,
} from "@chromatis/base/errors";
import type {
  RealtimeConnection,
  RuntimeDefinition,
  RuntimeInstanceBehavior,
  RuntimeInstanceContext,
  RuntimeJson,
} from "@chromatis/base/stateful";
import {
  controllerSnapshot,
  eventFor,
  parseClientMessage,
  participantSnapshot,
  type ServerMessage,
  type Snapshot,
} from "../domain/protocol";
import {
  addParticipant,
  applyIntent,
  createSession,
  isExpired,
  setConnected,
  type Actor,
  type ClassroomEvent,
  type ClassroomSession,
  type Intent,
  type Outcome,
  type Rejection,
  type SessionInit,
} from "../domain/session";

/**
 * The Classroom Session as a Chromatis Runtime Instance. This file is the
 * only place where the Classroom meets the Stateful Runtime contract, and
 * it uses nothing but that contract: the same definition runs in the Bun
 * Runtime Host and in the Cloudflare Runtime Host.
 */
export const CLASSROOM_KIND = "classroom";

/** What the creator hands to `StatefulRuntime.create`. */
export type ClassroomRuntimeInit = SessionInit & {
  /** Authorises control of this session; never derived from the join code. */
  controllerToken: string;
};

/** Commands the application sends to a session. */
export type ClassroomCommand =
  | { type: "join"; name: string }
  | { type: "snapshot"; token: string }
  | { type: "act"; token: string; intent: Intent }
  | { type: "expire" };

export type JoinResult = { participantId: string; token: string };

export type ClassroomRuntimeOptions = {
  now?: () => number;
  /** How long a session lives without being ended. */
  ttlMs?: number;
};

export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const json = (value: unknown): RuntimeJson => value as RuntimeJson;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/** Compares without leaking the position of the first difference. */
function sameToken(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function rejectionError(reason: Rejection): Error {
  switch (reason) {
    case "forbidden":
      return new PermissionDeniedError("Not allowed in this session");
    case "invalid":
      return new ValidationError("Invalid request");
    case "full":
      return new ConflictError("The session is full");
    default:
      return new NotFoundError("Unknown classroom session");
  }
}

function isInit(init: RuntimeJson): boolean {
  const value = init as Record<string, unknown> | null;
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.code === "string" &&
    typeof value.buildId === "string" &&
    typeof value.title === "string" &&
    typeof value.controllerToken === "string" &&
    value.controllerToken.length >= 32
  );
}

/** One running Classroom Session: its state, tokens and connections. */
class ClassroomInstance {
  private session: ClassroomSession;
  private readonly controllerToken: string;
  private readonly participantTokens = new Map<string, string>();
  private readonly actors = new Map<string, Actor>();
  /** Open connections per participant: a reload briefly has two. */
  private readonly connectionCounts = new Map<string, number>();

  constructor(
    private readonly context: RuntimeInstanceContext,
    init: ClassroomRuntimeInit,
    private readonly now: () => number,
    ttlMs: number,
  ) {
    const { controllerToken, ...settings } = init;
    this.controllerToken = controllerToken;
    this.session = createSession(settings, now(), ttlMs);
  }

  behavior(): RuntimeInstanceBehavior {
    return {
      onCommand: (command) => this.command(command as ClassroomCommand),
      onConnect: (connection) => this.connect(connection),
      onMessage: (connection, data) => this.message(connection, data),
      onDisconnect: (connection) => this.disconnect(connection),
    };
  }

  private authenticate(token: string): Actor | null {
    if (sameToken(token, this.controllerToken)) {
      return { role: "controller" };
    }
    const participantId = this.participantTokens.get(token);
    return participantId ? { role: "participant", participantId } : null;
  }

  private actorOrThrow(token: string): Actor {
    const actor = this.authenticate(token);
    if (!actor) {
      throw new PermissionDeniedError("Invalid session token");
    }
    return actor;
  }

  private snapshotFor(actor: Actor): Snapshot {
    const snapshot =
      actor.role === "controller"
        ? controllerSnapshot(this.session)
        : participantSnapshot(this.session, actor.participantId);
    if (!snapshot) {
      throw new NotFoundError("Unknown classroom session");
    }
    return snapshot;
  }

  private publish(events: ClassroomEvent[]): void {
    for (const connection of this.context.connections()) {
      const actor = this.actors.get(connection.id);
      if (!actor) {
        continue;
      }
      sendTo(connection, {
        type: "snapshot",
        snapshot: this.snapshotFor(actor),
      });
      for (const event of events) {
        const visible = eventFor(actor.role, event);
        if (visible) {
          sendTo(connection, { type: "event", event: visible });
        }
      }
    }
  }

  /** Commits an outcome, tells everyone, and closes an ended session. */
  private commit(outcome: Outcome): void {
    if (!outcome.ok) {
      throw rejectionError(outcome.reason);
    }
    this.session = outcome.session;
    this.publish(outcome.events);
    if (this.session.status === "ended") {
      this.context.close("ended");
    }
  }

  /** An expired session ends itself the next time anything touches it. */
  private liveOrEnd(): void {
    if (isExpired(this.session, this.now())) {
      this.commit(
        applyIntent(
          this.session,
          { role: "controller" },
          { type: "end" },
          () => "",
        ),
      );
    }
    if (this.session.status === "ended") {
      throw new NotFoundError("Unknown classroom session");
    }
  }

  private countConnections(participantId: string, by: 1 | -1): number {
    const count = Math.max(
      0,
      (this.connectionCounts.get(participantId) ?? 0) + by,
    );
    this.connectionCounts.set(participantId, count);
    return count;
  }

  private command(command: ClassroomCommand): RuntimeJson {
    if (command.type === "expire") {
      try {
        this.liveOrEnd();
        return false;
      } catch (error) {
        if (error instanceof NotFoundError) {
          return true;
        }
        throw error;
      }
    }
    this.liveOrEnd();
    switch (command.type) {
      case "join":
        return json(this.join(String(command.name)));
      case "snapshot":
        return json(this.snapshotFor(this.actorOrThrow(String(command.token))));
      case "act": {
        const actor = this.actorOrThrow(String(command.token));
        this.commit(
          applyIntent(this.session, actor, command.intent, () =>
            crypto.randomUUID(),
          ),
        );
        return json(this.snapshotFor(actor));
      }
      default:
        throw new ValidationError("Unknown classroom command");
    }
  }

  private join(name: string): JoinResult {
    const participantId = crypto.randomUUID();
    this.commit(
      addParticipant(this.session, { id: participantId, name }, this.now()),
    );
    const token = randomToken();
    this.participantTokens.set(token, participantId);
    return { participantId, token };
  }

  private connect(connection: RealtimeConnection): void {
    this.liveOrEnd();
    const actor = this.actorOrThrow(connection.params.token ?? "");
    this.actors.set(connection.id, actor);
    if (
      actor.role === "participant" &&
      this.countConnections(actor.participantId, 1) === 1
    ) {
      // Everyone, including this connection, gets the new roster.
      this.commit(setConnected(this.session, actor.participantId, true));
      return;
    }
    sendTo(connection, { type: "snapshot", snapshot: this.snapshotFor(actor) });
  }

  private message(connection: RealtimeConnection, data: string): void {
    const actor = this.actors.get(connection.id);
    if (!actor) {
      return;
    }
    const message = parseClientMessage(data);
    if (!message) {
      sendTo(connection, { type: "error", reason: "bad-message" });
      return;
    }
    if (message.type === "ping") {
      sendTo(connection, { type: "pong" });
      return;
    }
    try {
      this.liveOrEnd();
      this.commit(
        applyIntent(this.session, actor, message.intent, () =>
          crypto.randomUUID(),
        ),
      );
    } catch (error) {
      sendTo(connection, { type: "error", reason: reasonOf(error) });
    }
  }

  private disconnect(connection: RealtimeConnection): void {
    const actor = this.actors.get(connection.id);
    this.actors.delete(connection.id);
    if (
      actor?.role === "participant" &&
      this.session.status === "open" &&
      this.countConnections(actor.participantId, -1) === 0
    ) {
      this.commit(setConnected(this.session, actor.participantId, false));
    }
  }
}

function sendTo(connection: RealtimeConnection, message: ServerMessage): void {
  connection.send(JSON.stringify(message));
}

function reasonOf(error: unknown): Rejection {
  return error instanceof PermissionDeniedError
    ? "forbidden"
    : error instanceof ValidationError
      ? "invalid"
      : "not-found";
}

export function createClassroomRuntime(
  options: ClassroomRuntimeOptions = {},
): RuntimeDefinition {
  const now = options.now ?? Date.now;
  const ttlMs = options.ttlMs ?? DEFAULT_SESSION_TTL_MS;
  return {
    kind: CLASSROOM_KIND,
    create(context, init) {
      if (!isInit(init)) {
        throw new ValidationError("Invalid classroom session settings");
      }
      return new ClassroomInstance(
        context,
        init as unknown as ClassroomRuntimeInit,
        now,
        ttlMs,
      ).behavior();
    },
  };
}
