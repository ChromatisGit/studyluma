import { useEffect, useRef, useCallback } from "react";
import type { AdminStreamEvent } from "@schema/streamTypes";

type SlideStreamOptions = {
  courseId: string;
  onEvent: (event: AdminStreamEvent) => void;
};

export function useSlideStream(_options: SlideStreamOptions): void {
  // Realtime removed. Slide state is read from DB via loader on each navigation.
}

export function useStableCallback<T extends (...args: never[]) => unknown>(fn: T): T {
  const ref = useRef(fn);
  useEffect(() => { ref.current = fn; });
  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
