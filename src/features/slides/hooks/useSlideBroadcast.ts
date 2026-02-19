"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SlideMessage } from "@schema/slideTypes";

type UseSlideBroadcastOptions = {
  channelName: string;
  onMessage: (message: SlideMessage) => void;
};

export function useSlideBroadcast({
  channelName,
  onMessage,
}: UseSlideBroadcastOptions) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

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

  const postMessage = useCallback(
    (message: SlideMessage) => {
      if (channelRef.current) {
        channelRef.current.postMessage(message);
      } else {
        // localStorage fallback
        localStorage.setItem(channelName, JSON.stringify(message));
      }
    },
    [channelName]
  );

  return { postMessage };
}
