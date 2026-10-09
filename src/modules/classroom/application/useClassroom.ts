import { useCallback, useEffect, useRef, useState } from "react";
import type { ServerMessage, Snapshot, WireIntent } from "../domain/protocol";

/** The resource route: snapshots over HTTP and the commands that need the server. */
export const CLASSROOM_PATH = "/classroom";
export const CLASSROOM_SOCKET_PATH = "/classroom/ws";

const POLL_MS = 2000;
/** A socket that has not opened by then is treated as unavailable. */
const OPEN_TIMEOUT_MS = 3000;
const MAX_BACKOFF_MS = 15_000;

/** Posts a command to the Website; the new state arrives as a snapshot. */
export async function postClassroom(body: unknown): Promise<boolean> {
  try {
    const response = await fetch(CLASSROOM_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export type ClassroomConnection = {
  /** `undefined` until the first answer, `null` when there is no session. */
  snapshot: Snapshot | null | undefined;
  /** Sends over the socket, or over HTTP while there is none. */
  send(intent: WireIntent): Promise<boolean>;
};

function socketUrl(): string {
  const url = new URL(CLASSROOM_SOCKET_PATH, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

/**
 * Follows the Classroom Session of this browser over its WebSocket. The
 * socket reconnects with backoff and, because the server's snapshot is
 * complete, a reconnect recovers everything it missed. Where no socket is
 * available (the Vite dev server) the same snapshot is polled instead.
 */
export function useClassroom(enabled: boolean): ClassroomConnection {
  const [snapshot, setSnapshot] = useState<Snapshot | null | undefined>(
    undefined,
  );
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || typeof WebSocket === "undefined") {
      return;
    }
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    /** Snapshots from the socket are newer than any poll in flight. */
    let live = false;

    const poll = async () => {
      try {
        const response = await fetch(CLASSROOM_PATH, { cache: "no-store" });
        const body = (await response.json()) as { snapshot: Snapshot | null };
        if (!stopped && !live) {
          setSnapshot(body.snapshot);
        }
      } catch {
        // offline: the next attempt tries again
      }
    };

    const open = () => {
      if (stopped) {
        return;
      }
      const socket = new WebSocket(socketUrl());
      socketRef.current = socket;
      const giveUp = setTimeout(() => socket.close(), OPEN_TIMEOUT_MS);
      socket.onopen = () => {
        clearTimeout(giveUp);
        attempt = 0;
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === "snapshot") {
            live = true;
            setSnapshot(message.snapshot);
          }
        } catch {
          // a broken frame is replaced by the next snapshot
        }
      };
      socket.onclose = () => {
        clearTimeout(giveUp);
        live = false;
        socketRef.current = null;
        if (stopped) {
          return;
        }
        attempt += 1;
        void poll();
        timer = setTimeout(
          open,
          Math.min(POLL_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS),
        );
      };
    };
    // The first snapshot does not wait for the socket.
    void poll();
    open();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled]);

  const send = useCallback(async (intent: WireIntent) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "intent", intent }));
      return true;
    }
    return postClassroom({ intent: "act", payload: intent });
  }, []);

  return { snapshot: enabled ? snapshot : undefined, send };
}
