"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SlideMessage } from "@schema/slideTypes";
import {
  updateSlideStateAction,
  heartbeatSlideSessionAction,
} from "@actions/slideActions";

const CROSS_DEVICE = process.env.NEXT_PUBLIC_SLIDES_CROSS_DEVICE === "true";

type UseSlideBroadcastOptions = {
  channelName: string;
  onMessage: (message: SlideMessage) => void;
  role?: "presenter" | "projector";
  onSessionExpired?: () => void;
};

export function useSlideBroadcast({
  channelName,
  onMessage,
  role,
  onSessionExpired,
}: UseSlideBroadcastOptions) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  const onSessionExpiredRef = useRef(onSessionExpired);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    onSessionExpiredRef.current = onSessionExpired;
  });

  // BroadcastChannel (same-device)
  useEffect(() => {
    try {
      const channel = new BroadcastChannel(channelName);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<SlideMessage>) => {
        onMessageRef.current(event.data);
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported — fall back to localStorage
      const handler = (event: StorageEvent) => {
        if (event.key === channelName && event.newValue) {
          try {
            onMessageRef.current(JSON.parse(event.newValue));
          } catch {
            /* ignore parse errors */
          }
        }
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    }
  }, [channelName]);

  // Cross-device: heartbeat (presenter only)
  useEffect(() => {
    if (!CROSS_DEVICE || role !== "presenter") return;
    const id = setInterval(
      () => heartbeatSlideSessionAction(channelName),
      5 * 60_000,
    );
    return () => clearInterval(id);
  }, [channelName, role]);

  // Cross-device: adaptive polling (projector only)
  useEffect(() => {
    if (!CROSS_DEVICE || role !== "projector") return;

    let lastModified: string | null = null;
    let consecutiveUnchanged = 0;
    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stopped) return;
      try {
        const headers: HeadersInit = { "Cache-Control": "no-cache" };
        if (lastModified) headers["If-Modified-Since"] = lastModified;

        const res = await fetch(`/api/slides/${channelName}/state`, { headers });

        if (res.status === 410) {
          stopped = true;
          onSessionExpiredRef.current?.();
          return;
        }

        if (res.status === 304) {
          consecutiveUnchanged++;
        } else if (res.ok) {
          consecutiveUnchanged = 0;
          lastModified = res.headers.get("Last-Modified");
          const state = await res.json();
          onMessageRef.current({ type: "STATE_UPDATE", state });
        }
      } catch {
        consecutiveUnchanged = Math.max(consecutiveUnchanged, 34);
      }

      timeoutId = setTimeout(poll, consecutiveUnchanged > 33 ? 2000 : 150);
    }

    poll();
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [channelName, role]);

  const postMessage = useCallback(
    (message: SlideMessage) => {
      if (channelRef.current) {
        channelRef.current.postMessage(message);
      } else {
        // localStorage fallback
        localStorage.setItem(channelName, JSON.stringify(message));
      }

      // Cross-device: debounced save on STATE_UPDATE (presenter only)
      if (CROSS_DEVICE && role === "presenter" && message.type === "STATE_UPDATE") {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          updateSlideStateAction(channelName, message.state);
        }, 100);
      }
    },
    [channelName, role],
  );

  return { postMessage };
}
