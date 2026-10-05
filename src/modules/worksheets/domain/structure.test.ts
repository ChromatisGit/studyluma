import { describe, expect, test } from "bun:test";
import chapterJson from "../infrastructure/fixtures/9-2.json";
import { emptyChapterState } from "./chapterState";
import type { Chapter, PartResponse } from "./contract";
import {
  baseLevel,
  helpLadder,
  indexChapter,
  recommendation,
  recordCheck,
  sheetDone,
  structureLevel,
} from "./structure";

const chapter = chapterJson as Chapter;
const index = indexChapter(chapter);
const info = (id: string) => {
  const found = index.aufgaben.get(id);
  if (!found) {
    throw new Error(id);
  }
  return found;
};

describe("structure and help", () => {
  const stepsTask = info("potenzregel-in-schritten");
  const part = stepsTask.aufgabe.parts[0];

  test("the mode picks the structure level from ::struktur", () => {
    const state = emptyChapterState();
    state.modes.potenzregel = "unterstuetzung";
    expect(baseLevel(stepsTask, state)).toBe(2);
    state.modes.potenzregel = "uebung";
    expect(baseLevel(stepsTask, state)).toBe(1);
    state.modes.potenzregel = "challenges";
    expect(baseLevel(stepsTask, state)).toBe(0);
  });

  test("the ladder leaves out what the task already shows", () => {
    const state = emptyChapterState();
    state.modes.potenzregel = "challenges";
    expect(
      part && helpLadder(part, stepsTask, state).map((s) => s.kind),
    ).toEqual(["tip", "rule", "example", "plan", "rechenweg"]);
    state.modes.potenzregel = "uebung";
    expect(
      part && helpLadder(part, stepsTask, state).map((s) => s.kind),
    ).toEqual(["tip", "example", "rechenweg"]);
  });

  test("help raises the structure level", () => {
    const state = emptyChapterState();
    state.modes.potenzregel = "challenges";
    expect(structureLevel(stepsTask, state, { [part?.id ?? ""]: 4 })).toBe(1);
    expect(structureLevel(stepsTask, state, { [part?.id ?? ""]: 5 })).toBe(2);
  });

  test("the checkpoint has no help", () => {
    const checkpointTask = [...index.aufgaben.values()].find(
      (a) => a.inCheckpoint,
    );
    const first = checkpointTask?.aufgabe.parts[0];
    expect(
      checkpointTask &&
        first &&
        helpLadder(first, checkpointTask, emptyChapterState()),
    ).toEqual([]);
  });
});

describe("progress", () => {
  test("a sheet is done once its Ampel is answered", () => {
    const state = emptyChapterState();
    const sheet = chapter.sheets[0];
    expect(sheet && sheetDone(sheet, state)).toBe(false);
    state.ampels[sheet?.id ?? ""] = { level: "green" };
    expect(sheet && sheetDone(sheet, state)).toBe(true);
  });

  test("a locked recommended sheet falls back to the challenges", () => {
    const state = emptyChapterState();
    const withSheet = chapter.sheets.find(
      (sheet) => sheet.weiter.type === "sheet",
    );
    if (withSheet && withSheet.weiter.type === "sheet") {
      state.unlocked[withSheet.weiter.sheetId] = false;
      expect(recommendation(withSheet, chapter, state)).toEqual({
        type: "challenges",
      });
    }
  });

  test("wrong checks count only when the answer changed", () => {
    let response: PartResponse = { value: ["a"], wrongChecks: 0 };
    response = recordCheck(response, { state: "nochNicht" });
    response = recordCheck(response, { state: "nochNicht" });
    expect(response.wrongChecks).toBe(1);
    response = recordCheck(
      { ...response, value: ["b"] },
      { state: "nochNicht" },
    );
    expect(response.wrongChecks).toBe(2);
  });
});
