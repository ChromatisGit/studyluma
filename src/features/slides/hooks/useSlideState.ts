"use client";

import { useState, useCallback } from "react";
import type { SlideState } from "@schema/slideTypes";

type UseSlideStateOptions = {
  totalSlides: number;
};

function getInitialSlide(totalSlides: number): number {
  if (typeof window === "undefined") return 0;
  const params = new URLSearchParams(window.location.search);
  const s = parseInt(params.get("s") ?? "0", 10);
  return Math.min(Math.max(0, s), totalSlides - 1);
}

export function useSlideState({ totalSlides }: UseSlideStateOptions) {
  const [state, setState] = useState<SlideState>(() => ({
    slideIndex: getInitialSlide(totalSlides),
    blackout: false,
    interactiveState: {},
  }));

  const setSlideIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      setState((prev) => ({ ...prev, slideIndex: clamped }));
      const url = new URL(window.location.href);
      url.searchParams.set("s", String(clamped));
      window.history.replaceState(null, "", url.pathname + url.search);
    },
    [totalSlides]
  );

  const toggleBlackout = useCallback(() => {
    setState((prev) => ({ ...prev, blackout: !prev.blackout }));
  }, []);

  const next = useCallback(
    () => setSlideIndex(state.slideIndex + 1),
    [state.slideIndex, setSlideIndex]
  );
  const prev = useCallback(
    () => setSlideIndex(state.slideIndex - 1),
    [state.slideIndex, setSlideIndex]
  );
  const goTo = setSlideIndex;
  const first = useCallback(() => setSlideIndex(0), [setSlideIndex]);
  const last = useCallback(
    () => setSlideIndex(totalSlides - 1),
    [setSlideIndex, totalSlides]
  );

  return { state, setState, next, prev, goTo, first, last, toggleBlackout };
}
