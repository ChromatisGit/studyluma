import { describe, expect, test } from "bun:test";
import { buildId, serveSiteFixture } from "../src/test/site";
import { typstToRow } from "../src/modules/worksheets";
import { checkSubmitted, checkSubmittedStep } from "./answer.server";

serveSiteFixture();

describe("checking answers on the server", () => {
  test("a gap task is checked per gap", () => {
    const result = checkSubmitted(buildId, "p-gap", {
      g1: "wort",
      g2: "falsch",
      g3: typstToRow("1/3"),
    });
    expect(result?.items).toEqual({
      g1: "richtig",
      g2: "nochNicht",
      g3: "richtig",
    });
    expect(result?.state).toBe("nochNicht");
  });

  test("an answer and its known wrong answers", () => {
    expect(
      checkSubmitted(buildId, "p-answer", typstToRow("4 x^3"))?.state,
    ).toBe("richtig");
    expect(
      checkSubmitted(buildId, "p-answer", typstToRow("4 x^4"))?.message,
    ).toBe("Exponent?");
  });

  test("an Auswahl by option ids", () => {
    expect(checkSubmitted(buildId, "p-choice", ["p-choice-0"])?.state).toBe(
      "richtig",
    );
    expect(checkSubmitted(buildId, "p-choice", ["p-choice-1"])?.state).toBe(
      "nochNicht",
    );
  });

  test("a Rechenweg step checks its own gaps", () => {
    expect(
      checkSubmittedStep(buildId, "p-answer", "st1", { sg: typstToRow("3") })
        ?.state,
    ).toBe("richtig");
  });

  test("unknown parts, steps and builds are refused", () => {
    expect(checkSubmitted(buildId, "nope", [])).toBeUndefined();
    expect(checkSubmitted("x".repeat(64), "p-gap", {})).toBeUndefined();
    expect(checkSubmittedStep(buildId, "p-answer", "nope", {})).toBeUndefined();
  });
});
