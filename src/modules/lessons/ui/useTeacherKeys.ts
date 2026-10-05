import { useEffect } from "react";

export type TeacherKey =
  "next" | "previous" | "hide" | "overview" | "blank" | "escape";

const KEYS: Record<string, TeacherKey> = {
  ArrowRight: "next",
  ArrowDown: "next",
  " ": "next",
  Enter: "next",
  PageDown: "next",
  ArrowLeft: "previous",
  ArrowUp: "previous",
  PageUp: "previous",
  b: "hide",
  B: "hide",
  g: "overview",
  G: "overview",
  n: "blank",
  N: "blank",
  Escape: "escape",
};

/** Keyboard and presenter control; buttons keep their own Enter and Space. */
export function useTeacherKeys(onKey: (key: TeacherKey) => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) {
        return;
      }
      const key = KEYS[event.key];
      if (
        !key ||
        ((event.key === " " || event.key === "Enter") &&
          target.closest("button, a"))
      ) {
        return;
      }
      event.preventDefault();
      onKey(key);
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onKey]);
}
