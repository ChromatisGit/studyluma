"use client";

import { useState, useCallback, useEffect } from "react";
import type { TypedSlide } from "@schema/slideTypes";

type SlideRevealState = {
  slideIndex: number;
  blackout: boolean;
  revealStep: number;
};

type UseSlideStateOptions = {
  slides: TypedSlide[];
};

/** Returns how many sub-reveal steps a slide has (bullets + optional result). */
export function maxRevealSteps(slide: TypedSlide): number {
  if (
    slide.slideType === "sectionSlide" ||
    slide.slideType === "recapSlide" ||
    slide.slideType === "quizSlide"
  ) {
    return 0;
  }
  const isManual = slide.reveal === "manual";
  if (slide.slideType === "compareSlide") {
    if (!isManual) return 0;
    return slide.columns.length + (slide.result != null ? 1 : 0);
  }
  const bullets = "bullets" in slide ? (slide.bullets?.length ?? 0) : 0;
  const hasResult = slide.slideType !== "taskSlide" && "result" in slide && slide.result != null ? 1 : 0;
  return isManual ? bullets + hasResult : hasResult;
}

export function useSlideState({ slides }: UseSlideStateOptions) {
  const totalSlides = slides.length;
  const [state, setState] = useState<SlideRevealState>({
    slideIndex: 0,
    blackout: false,
    revealStep: 0,
  });

  // Apply URL ?s= param after mount — must match server initial (0) during hydration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get("s") ?? "0", 10);
    const initial = Math.min(Math.max(0, s), totalSlides - 1);
    if (initial !== 0) {
      setState((prev) => ({ ...prev, slideIndex: initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSlideIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      setState((prev) => ({ ...prev, slideIndex: clamped, revealStep: 0 }));
    },
    [totalSlides]
  );

  const toggleBlackout = useCallback(() => {
    setState((prev) => ({ ...prev, blackout: !prev.blackout }));
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      const currentSlide = slides[prev.slideIndex];
      const max = currentSlide ? maxRevealSteps(currentSlide) : 0;
      if (prev.revealStep < max) {
        return { ...prev, revealStep: prev.revealStep + 1 };
      }
      const nextIndex = Math.min(prev.slideIndex + 1, totalSlides - 1);
      if (nextIndex === prev.slideIndex) return prev;
      return { ...prev, slideIndex: nextIndex, revealStep: 0 };
    });
  }, [slides, totalSlides]);

  const prev = useCallback(() => {
    setState((prev) => {
      const prevIndex = Math.max(0, prev.slideIndex - 1);
      if (prevIndex === prev.slideIndex && prev.revealStep === 0) return prev;
      return { ...prev, slideIndex: prevIndex, revealStep: 0 };
    });
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("s", String(state.slideIndex));
    window.history.replaceState(null, "", url.pathname + url.search);
  }, [state.slideIndex]);

  const goTo = setSlideIndex;
  const first = useCallback(() => setSlideIndex(0), [setSlideIndex]);
  const last = useCallback(
    () => setSlideIndex(totalSlides - 1),
    [setSlideIndex, totalSlides]
  );

  return { state, setState, next, prev, goTo, first, last, toggleBlackout };
}
