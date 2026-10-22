import type { KeyboardEvent } from "react";
import type { FunctionName } from "../../content-renderer";
import type { MathEditor } from "../domain/editor";

/** What a key on the keypad or keyboard does in a math field. */
export type KeyAction =
  | { kind: "char"; value: string }
  | { kind: "frac"; fromKeyboard: boolean }
  | { kind: "function"; name: FunctionName }
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

/**
 * What a key does to the editor itself; `save` is false where it only moves
 * the cursor. null for the keys whose meaning depends on the field (check,
 * close, semicolon).
 */
export function editorCommand(
  action: KeyAction,
): { command: (editor: MathEditor) => void; save: boolean } | null {
  const run = (command: (editor: MathEditor) => void, save = true) => ({
    command,
    save,
  });
  switch (action.kind) {
    case "char":
      return run((editor) => editor.char(action.value));
    case "frac":
      return run((editor) => editor.frac(action.fromKeyboard));
    case "function":
      return run((editor) => editor.fn(action.name));
    case "sqrt":
      return run((editor) => editor.sqrt());
    case "squared":
      return run((editor) => editor.sup(true));
    case "power":
      return run((editor) => editor.sup());
    case "superscript":
      return run((editor) => editor.power(action.digit));
    case "left":
      return run((editor) => editor.left(), false);
    case "right":
      return run((editor) => editor.right(), false);
    case "back":
      return run((editor) => editor.back());
    default:
      return null;
  }
}
