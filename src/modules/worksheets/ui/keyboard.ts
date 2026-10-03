import type { KeyboardEvent } from "react";

/** What a key on the keypad or keyboard does in a math field. */
export type KeyAction =
  | { kind: "char"; value: string }
  | { kind: "frac"; fromKeyboard: boolean }
  | {
      kind:
        | "sqrt"
        | "squared"
        | "power"
        | "left"
        | "right"
        | "back"
        | "check"
        | "close";
    }
  | { kind: "superscript"; digit: string }
  | { kind: "semicolon" };

const CHARS: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "·",
  "(": "(",
  ")": ")",
  ",": ",",
  ".": ",",
  "%": "%",
};

/** The keyboard mapping of the spec; `null` leaves the key to the browser. */
export function keyboardAction(event: KeyboardEvent): KeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  const { key, code } = event;
  if (/^[0-9]$/.test(key)) {
    return { kind: "char", value: key };
  }
  const mapped = CHARS[key];
  if (mapped) {
    return { kind: "char", value: mapped };
  }
  if (/^\p{L}$/u.test(key) && key.length === 1) {
    return { kind: "char", value: key };
  }
  switch (key) {
    case ";":
      return { kind: "semicolon" };
    case "/":
    case ":":
      return { kind: "frac", fromKeyboard: true };
    case "^":
      return { kind: "power" };
    case "²":
      return { kind: "superscript", digit: "2" };
    case "³":
      return { kind: "superscript", digit: "3" };
    case "ArrowLeft":
      return { kind: "left" };
    case "ArrowRight":
      return { kind: "right" };
    case "Backspace":
      return { kind: "back" };
    case "Enter":
      return { kind: "check" };
    case "Dead":
      // On German keyboards "^" is a dead key on Backquote.
      return code === "Backquote" || code === "Equal"
        ? { kind: "power" }
        : null;
    default:
      return null;
  }
}
