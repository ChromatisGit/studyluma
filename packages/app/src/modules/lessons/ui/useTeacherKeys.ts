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

type KeyInput = Pick<
  KeyboardEvent,
  "key" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

/**
 * The presenter key a press stands for, if any. While a dialog is open the
 * dialog owns the keyboard (Escape closes it, Space presses its button).
 */
export function keyFor(
  event: KeyInput,
  dialogOpen = false,
): TeacherKey | undefined {
  if (dialogOpen || event.altKey) {
    return undefined;
  }
  if (event.metaKey || event.ctrlKey) {
    return event.key.toLowerCase() === "z" && !event.shiftKey
      ? "undo"
      : undefined;
  }
  return KEYS[event.key.length === 1 ? event.key.toLowerCase() : event.key];
}

const dialogIsOpen = () => document.querySelector("dialog[open]") !== null;

// A math field on a Grafikfolie is a textbox of its own.
const isTyping = (target: HTMLElement) =>
  target.closest(
    'input, textarea, select, [contenteditable], [role="textbox"]',
  ) !== null;

/** Keyboard and presenter control; Enter stays with the focused button. */
export function useTeacherKeys(onKey: (key: TeacherKey) => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (isTyping(target)) {
        return;
      }
      const key = keyFor(event, dialogIsOpen());
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
        !dialogIsOpen() &&
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
