import { useEffect } from "react";

export type TeacherKey =
  | "next"
  | "previous"
  | "hide"
  | "freeze"
  | "overview"
  | "blank"
  | "cursor"
  | "undo"
  | "escape";

/** Space and → advance, ← goes back; ↑ ↓ scroll, Enter stays with buttons. */
const KEYS: Record<string, TeacherKey> = {
  ArrowRight: "next",
  " ": "next",
  ArrowLeft: "previous",
  b: "hide",
  f: "freeze",
  g: "overview",
  n: "blank",
  c: "cursor",
  Escape: "escape",
};

function keyFor(event: KeyboardEvent): TeacherKey | undefined {
  if (event.altKey) {
    return undefined;
  }
  if (event.metaKey || event.ctrlKey) {
    return event.key.toLowerCase() === "z" && !event.shiftKey
      ? "undo"
      : undefined;
  }
  return KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
}

const isTyping = (target: HTMLElement) =>
  target.closest("input, textarea, select, [contenteditable]") !== null;

/** Keyboard and presenter control; Enter stays with the focused button. */
export function useTeacherKeys(onKey: (key: TeacherKey) => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (isTyping(target)) {
        return;
      }
      const key = keyFor(event);
      if (!key) {
        return;
      }
      event.preventDefault();
      onKey(key);
    };
    // A button clicks on Space-up; a slide step must not press it as well.
    const swallowSpaceUp = (event: KeyboardEvent) => {
      if (
        event.key === " " &&
        !isTyping(event.target as HTMLElement) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
      }
    };
    document.addEventListener("keydown", listener);
    document.addEventListener("keyup", swallowSpaceUp);
    return () => {
      document.removeEventListener("keydown", listener);
      document.removeEventListener("keyup", swallowSpaceUp);
    };
  }, [onKey]);
}
