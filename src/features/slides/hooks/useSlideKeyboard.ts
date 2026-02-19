"use client";

import { useEffect, useRef } from "react";

type UseSlideKeyboardOptions = {
  onNext: () => void;
  onPrev: () => void;
  onFirst: () => void;
  onLast: () => void;
  onBlackout: () => void;
  onFullscreen: () => void;
  onGrid: () => void;
  onLaser: () => void;
};

const IGNORE_TARGETS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function shouldIgnoreEvent(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  if (IGNORE_TARGETS.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  if (target.closest("[data-code-editor]")) return true;
  return false;
}

export function useSlideKeyboard(options: UseSlideKeyboardOptions) {
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (shouldIgnoreEvent(event)) return;

      const opts = optionsRef.current;

      switch (event.key) {
        case "ArrowRight":
        case " ":
        case "PageDown":
          event.preventDefault();
          opts.onNext();
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          opts.onPrev();
          break;
        case "Home":
          event.preventDefault();
          opts.onFirst();
          break;
        case "End":
          event.preventDefault();
          opts.onLast();
          break;
        case "b":
        case "B":
          opts.onBlackout();
          break;
        case "f":
        case "F":
          opts.onFullscreen();
          break;
        case "g":
        case "G":
          opts.onGrid();
          break;
        case "l":
        case "L":
          opts.onLaser();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
