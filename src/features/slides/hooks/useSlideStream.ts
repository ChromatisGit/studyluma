"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AdminStreamEvent } from "@schema/streamTypes";

type SlideStreamOptions = {
  courseId: string;
  onEvent: (event: AdminStreamEvent) => void;
};

/**
 * Connects to Ably for realtime SLIDE_STATE and QUIZ_STATE events on the
 * admin classroom channel. Fetches an initial AdminSnapshot from the DB-backed
 * polling endpoint on each (re)connect so the projector is never stale.
 */
export function useSlideStream({ courseId, onEvent }: SlideStreamOptions): void {
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    if (!courseId) return;

    let dead = false;
    let ablyClient: import("ably").Realtime | null = null;

    async function init() {
      const { Realtime } = await import("ably");
      if (dead) return;

      ablyClient = new Realtime({
        authCallback: async (_params, callback) => {
          try {
            const res = await fetch(
              `/api/ably/token?courseId=${encodeURIComponent(courseId)}`,
            );
            const { tokenRequest } = await res.json() as { tokenRequest: unknown };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            callback(null, tokenRequest as any);
          } catch (err) {
            callback((err as Error).message, null);
          }
        },
      });

      // Fetch snapshot on every (re)connect so the projector is always current
      ablyClient.connection.on("connected", async () => {
        if (dead) return;
        try {
          const res = await fetch(
            `/api/stream/presentation?courseId=${encodeURIComponent(courseId)}`,
          );
          if (res.ok && !dead) {
            onEventRef.current(await res.json() as AdminStreamEvent);
          }
        } catch {}
      });

      const channel = ablyClient.channels.get(`classroom:${courseId}:admin`);
      await channel.subscribe((msg) => {
        if (!dead) onEventRef.current(msg.data as AdminStreamEvent);
      });
    }

    void init();

    return () => {
      dead = true;
      ablyClient?.close();
    };
  }, [courseId]);
}

/**
 * Stable callback helper: wraps a function that should not be in deps.
 */
export function useStableCallback<T extends (...args: never[]) => unknown>(
  fn: T,
): T {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
