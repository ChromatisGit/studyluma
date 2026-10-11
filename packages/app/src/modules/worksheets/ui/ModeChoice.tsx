import { useState } from "react";
import { Button } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import type { Worksheet as Sheet } from "../../catalog";
import type { Mode } from "../domain/contract";
import { fixedMode, modeOf } from "../domain/structure";
import { useWorksheet } from "./WorksheetContext";
import { TEXT } from "./texts";

const MODES: Mode[] = ["unterstuetzung", "uebung", "challenges"];

/** "Wie willst du dieses Blatt bearbeiten?" at the start of a `wahl` sheet. */
export function ModeChoice({ sheet }: { sheet: Sheet }) {
  const { state, store, setUi } = useWorksheet();
  const [choice, setChoice] = useState<Mode | null>(modeOf(sheet, state));
  return (
    <div className="modewahl">
      <fieldset>
        <legend className="modewahl__q">{TEXT.modes.question}</legend>
        <div className="modewahl__options">
          {MODES.map((mode) => (
            <label key={mode} className="modewahl__opt">
              <input
                type="radio"
                name={`mode-${sheet.id}`}
                value={mode}
                checked={choice === mode}
                onChange={() => setChoice(mode)}
              />
              <span className="modewahl__name">{TEXT.modes[mode].name}</span>
              <span className="modewahl__desc">
                {TEXT.modes[mode].description}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        disabled={!choice}
        onClick={() => {
          if (!choice) {
            return;
          }
          store.setMode(sheet.id, choice);
          setUi((current) => ({
            ...current,
            pickMode: { ...current.pickMode, [sheet.id]: false },
            optionalOpen: {},
            help: {},
          }));
          window.scrollTo({ top: 0 });
        }}
      >
        {TEXT.modes.start}
      </Button>
    </div>
  );
}

/** The chosen mode with "ändern", under the sheet title. */
export function ModeLine({ sheet }: { sheet: Sheet }) {
  const { state, teacher, setUi } = useWorksheet();
  if (fixedMode(sheet)) {
    return null;
  }
  const mode = modeOf(sheet, state) ?? "uebung";
  const name = TEXT.modes[mode].name;
  return (
    <p className="modus-line">
      {teacher && !state.modes[sheet.id]
        ? fill(TEXT.modes.preview, { mode: name })
        : name}
      <button
        type="button"
        className="link-btn"
        onClick={() =>
          setUi((current) => ({
            ...current,
            pickMode: { ...current.pickMode, [sheet.id]: true },
          }))
        }
      >
        {TEXT.modes.change}
      </button>
    </p>
  );
}
