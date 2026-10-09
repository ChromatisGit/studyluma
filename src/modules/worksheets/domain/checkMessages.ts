import { fill, plural } from "../../../helper/text";
import TEXT from "../ui/worksheets.de.json";
import type { CheckMessages } from "./check";

/** Markdown cell heads as plain text for messages ("f′(x) bei x = 0,5"). */
export const plainText = (markdown: string) =>
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
