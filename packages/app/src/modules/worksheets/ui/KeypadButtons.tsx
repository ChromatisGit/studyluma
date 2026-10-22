import { useState } from "react";
import { fill } from "../../../helper/text";
import type { KeyAction } from "./keyboard";
import {
  digitKeys,
  functionKeys,
  letterKeys,
  topKeys,
  type KeyDef,
  type KeypadPage,
} from "./keypadKeys";
import { TEXT } from "./texts";

function KeyButton({
  def,
  onPress,
}: {
  def: KeyDef;
  onPress: (def: KeyDef) => void;
}) {
  return (
    <button
      type="button"
      className={`kp-key kp-key--${def.className ?? "op"}`}
      aria-label={def.aria}
      aria-disabled={def.later ? true : undefined}
      onClick={() => onPress(def)}
    >
      {def.label}
    </button>
  );
}

export interface KeypadButtonsProps {
  /** The letter on the variable key. */
  variable: string;
  onAction: (action: KeyAction) => void;
  /** A note for the display; null clears it. */
  onMessage: (message: string | null) => void;
}

/**
 * The keys of the keypad: two fixed rows and a page of digits, letters or
 * functions. Give it a new `key` to start again on the digits.
 */
export function KeypadButtons({
  variable,
  onAction,
  onMessage,
}: KeypadButtonsProps) {
  const [page, setPage] = useState<KeypadPage>("123");
  const press = (def: KeyDef) => {
    if (def.page) {
      setPage(def.page);
      return;
    }
    if (def.later) {
      onMessage(fill(TEXT.keypad.laterMessage, { key: def.later }));
      return;
    }
    if (def.action) {
      onMessage(null);
      onAction(def.action);
      if (def.className === "letter") {
        setPage("123");
      }
    }
  };
  const lower =
    page === "abc" ? letterKeys : page === "fx" ? functionKeys : digitKeys;
  return (
    <div className="kp-keys">
      <div className="kp-top">
        {topKeys(variable).map((def) => (
          <KeyButton key={def.id} def={def} onPress={press} />
        ))}
      </div>
      <div className={`kp-lower kp-lower--${page}`}>
        {lower.map((def) => (
          <KeyButton key={def.id} def={def} onPress={press} />
        ))}
      </div>
    </div>
  );
}
