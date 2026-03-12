"use client";

import { useEffect, useRef } from "react";
import type { StudentStreamEvent } from "@schema/streamTypes";

type QuizStreamOptions = {
  onEvent: (event: StudentStreamEvent) => void;
  /** If false, the hook is dormant (e.g., while waiting for page to mount). */
  enabled?: boolean;
};

/**
 * Connects to Ably for realtime QUIZ_STATE and QUIZ_STARTED events across all
 * of the user's enrolled courses. Fetches an initial StudentSnapshot from the
 * DB-backed polling endpoint on each (re)connect so state is never stale.
 */
export function useQuizStream({ onEvent, enabled = true }: QuizStreamOptions): void {
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!enabled) return;

    let dead = false;
    let ablyClient: import("ably").Realtime | null = null;

    async function init() {
      // Fetch token + enrolled courseIds from a single endpoint
      let tokenRequest: unknown;
      let courseIds: string[];
      try {
        const res = await fetch("/api/ably/token");
        if (!res.ok) return;
        ({ tokenRequest, courseIds } = await res.json() as { tokenRequest: unknown; courseIds: string[] });
      } catch {
        return;
      }
      if (dead || !courseIds.length) return;

      const { Realtime } = await import("ably");
      if (dead) return;

      ablyClient = new Realtime({
        authCallback: async (_params, callback) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback(null, tokenRequest as any);
        },
      });

      // Fetch snapshot on every (re)connect
      ablyClient.connection.on("connected", async () => {
        if (dead) return;
        try {
          const res = await fetch("/api/stream/quiz");
          if (res.ok && !dead) {
            onEventRef.current(await res.json() as StudentStreamEvent);
          }
        } catch {}
      });

      // Subscribe to student channel for each enrolled course
      for (const id of courseIds) {
        const channel = ablyClient.channels.get(`classroom:${id}:student`);
        await channel.subscribe((msg) => {
          if (!dead) onEventRef.current(msg.data as StudentStreamEvent);
        });
      }
    }

    void init();

    return () => {
      dead = true;
      ablyClient?.close();
    };
  }, [enabled]);
}
