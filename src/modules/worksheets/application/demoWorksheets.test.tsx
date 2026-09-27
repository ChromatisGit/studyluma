import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GapMarkdownRenderer,
  GapRenderProvider,
  MarkdownRenderer,
} from "../../content";
import {
  isWorksheetComplete,
  prepareWorksheetAnswer,
  readAnswers,
  type Answers,
} from "./answers";
import { parseWorksheet } from "./parseWorksheet";

const relativeFiles = [
  "terme-gleichungen/00-terme-umformen/worksheets/00-terme-umformen.md",
  "terme-gleichungen/10-binomische-formeln/worksheets/00-binomische-formeln.md",
  "terme-gleichungen/20-bruchrechnung/worksheets/00-bruchrechnung.md",
  "vektorgeometrie/200-geraden/worksheets/00-geraden.md",
  "vektorgeometrie/220-lage-geraden/worksheets/00-lage-geraden.md",
];
const contentRoot = [
  resolve(
    import.meta.dir,
    "../../../../../studyluma-content/content/base/math",
  ),
  resolve(
    import.meta.dir,
    "../../../../../product-studyluma-content/content/base/math",
  ),
].find((root) => existsSync(resolve(root, relativeFiles[0] ?? "")));

describe("the five legacy Demo worksheets", () => {
  for (const [index, relativeFile] of relativeFiles.entries()) {
    (contentRoot ? test : test.skip)(
      `renders and can answer worksheet ${index + 1}`,
      () => {
        const body = readFileSync(
          resolve(contentRoot ?? "", relativeFile),
          "utf8",
        );
        const exercises = parseWorksheet(body);
        expect(exercises.length).toBe([6, 9, 8, 8, 8][index] ?? -1);
        const answers: Answers = { responses: {}, completed: false };
        for (const exercise of exercises) {
          if (exercise.kind === "gap") {
            answers.responses[exercise.id] = exercise.gaps.map(
              (options) => options[0] ?? "",
            );
            expect(
              renderToStaticMarkup(
                <GapRenderProvider
                  renderGap={(gapIndex) => (
                    <select aria-label={`Lücke ${gapIndex + 1}`} />
                  )}
                >
                  <GapMarkdownRenderer markdown={exercise.prompt} />
                </GapRenderProvider>,
              ),
            ).toContain("<select");
          } else {
            expect(
              renderToStaticMarkup(
                <MarkdownRenderer markdown={exercise.prompt} />,
              ),
            ).not.toBe("");
            answers.responses[exercise.id] =
              exercise.kind === "mcq"
                ? ["0"]
                : exercise.kind === "single-choice"
                  ? "0"
                  : "Antwort";
          }
        }
        expect(isWorksheetComplete(exercises, answers)).toBe(true);
        const submitted = prepareWorksheetAnswer(
          body,
          JSON.stringify(answers),
          true,
        );
        expect(submitted.ok).toBe(true);
        if (submitted.ok) {
          expect(readAnswers(submitted.answer).completed).toBe(true);
          expect(Object.keys(readAnswers("").responses)).toHaveLength(0);
        }
        delete answers.responses[exercises[0]?.id ?? ""];
        expect(isWorksheetComplete(exercises, answers)).toBe(false);
        expect(
          prepareWorksheetAnswer(body, JSON.stringify(answers), true).ok,
        ).toBe(false);
      },
    );
  }
});
