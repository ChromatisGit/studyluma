import { fill } from "../../../helper/text";
import type { SpeechWords } from "../domain/editor";
import type { AufgabeInfo } from "../domain/structure";
import TEXT from "./worksheets.de.json";

export { TEXT };
export { checkMessages } from "../domain/checkMessages";

export const speechWords: SpeechWords = {
  empty: TEXT.speech.empty,
  symbols: TEXT.speech.symbols,
  fraction: (numerator, denominator) =>
    fill(TEXT.speech.fraction, { numerator, denominator }),
  root: (radicand) => fill(TEXT.speech.root, { radicand }),
  squared: TEXT.speech.squared,
  power: (exponent) => fill(TEXT.speech.power, { exponent }),
};

/** "Aufgabe 3", "Checkpoint 1", "Challenge 2". */
export function refLabel(info: AufgabeInfo): string {
  const template = info.challenge
    ? TEXT.refs.challenge
    : info.inCheckpoint
      ? TEXT.refs.checkpoint
      : TEXT.refs.aufgabe;
  return fill(template, { number: info.number });
}
