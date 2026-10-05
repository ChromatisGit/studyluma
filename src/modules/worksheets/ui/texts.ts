import { fill, plural } from "../../../helper/text";
import type { CheckMessages } from "../domain/check";
import type { Markdown } from "../domain/contract";
import type { SpeechWords } from "../domain/editor";
import type { AufgabeInfo } from "../domain/structure";
import TEXT from "./worksheets.de.json";

export { TEXT };

/** Markdown cell heads as plain text for messages ("f′(x) bei x = 0,5"). */
export const plainText = (markdown: Markdown) =>
  markdown
    .replace(/\$/g, "")
    .replace(/'/g, "′")
    .replace(/(\d)\.(\d)/g, "$1,$2")
    .trim();

export const checkMessages: CheckMessages = {
  simplify: TEXT.check.simplify,
  preferFraction: TEXT.check.preferFraction,
  exact: (form) => (form ? TEXT.check.exactWith[form] : TEXT.check.exact),
  places: (count) => plural(TEXT.check.places, count),
  rounding: TEXT.check.rounding,
  incomplete: TEXT.check.incomplete,
  missingSolution: TEXT.check.missingSolution,
  freeGaps: (count) => plural(TEXT.check.freeGaps, count),
  inCell: (cell, message) =>
    fill(TEXT.check.inCell, {
      row: plainText(cell.row),
      column: plainText(cell.column),
      message,
    }),
};

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
  return fill(template, { number: info.aufgabe.number });
}
