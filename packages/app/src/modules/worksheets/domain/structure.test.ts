/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "bun:test";
import type { Worksheet } from "../../catalog";
import { gap, para, part, task } from "../../../test/catalog";
import { emptyChapterState } from "./chapterState";
import type { PartResponse } from "./contract";
import {
  activeStep,
  answerLocked,
  challengeOpen,
  helpLadder,
  indexChapter,
  isFoldedOptional,
  isReleased,
  isUnlocked,
  openChallenges,
  recommendation,
  recordCheck,
  sectionDone,
  sheetDone,
  stepsOpenFromStart,
  stepsShown,
  tipOf,
  type SheetsData,
} from "./structure";

const card = {
  id: "m1",
  title: "Potenzregel",
  anchor: "potenzregel",
  chapterId: "c1",
  origin: "2.1 · Ableiten",
  href: "/courses/k/chapters/c1#potenzregel",
  rule: para("Regel"),
  examples: [para("Beispiel")],
};
const withTip = (tipp = para("Denk an die Regel.")): ReturnType<typeof part> =>
  part("p-steps", "Antwort", {
    answer: { exact: "4 x^3" },
    steps: {
      items: [
        {
          id: "s1",
          content: [{ type: "text", value: "Exponent: " }, gap("g1", "4")],
        },
        {
          id: "s2",
          content: [{ type: "text", value: "Faktor: " }, gap("g2", "4")],
        },
      ],
    },
    markers: {
      tipp: [
        ...tipp,
        {
          type: "paragraph",
          children: [
            { type: "merkkarteRef", targetId: "m1", title: "Potenzregel" },
          ],
        },
      ],
      loesung: para("4x^3"),
    },
  });

const stepsTask = task("t-steps", [withTip()]);
const gapsPart = part("p-gaps", "Einsetzen", {
  content: [
    {
      type: "paragraph",
      children: [gap("g-a", "eins"), gap("g-b", "zwei")],
    },
  ],
});
const optional = task("t-opt", [part("p-opt", "Auftrag")], { optional: true });
const checkTask = task("t-check", [
  part("p-check", "Antwort", { answer: { exact: "1" } }),
]);

const sheetA: Worksheet = {
  id: "A",
  slug: "a",
  chapterId: "c1",
  filename: "A",
  title: "Blatt A",
  chooseMode: true,
  nextWorksheetId: "B",
  sections: [
    {
      id: "sec1",
      checkpoint: false,
      title: "Aufgaben",
      items: [
        { type: "task", task: stepsTask },
        { type: "task", task: task("t-gaps", [gapsPart]) },
        { type: "task", task: optional },
      ],
    },
    {
      id: "sec2",
      checkpoint: true,
      title: "Checkpoint",
      items: [{ type: "task", task: checkTask }],
    },
  ],
};
const sheetB: Worksheet = {
  id: "B",
  slug: "b",
  chapterId: "c1",
  filename: "B",
  title: "Blatt B",
  chooseMode: false,
  sections: [{ id: "s", checkpoint: false, title: "Aufgaben", items: [] }],
};
const challenge = task("ch1", [part("p-ch", "Auftrag")], {
  prerequisites: ["A"],
});
const data: SheetsData = {
  id: "c1",
  number: "2.1",
  title: "Ableiten",
  buildId: "b",
  viewer: "student",
  sheets: [sheetA, sheetB],
  challenges: [challenge],
  releasedSolutions: [],
  sessionSheets: null,
  cards: { m1: card },
};
const index = indexChapter(data);
const info = (id: string) => {
  const found = index.aufgaben.get(id);
  if (!found) {
    throw new Error(id);
  }
  return found;
};

describe("index", () => {
  test("tasks are numbered per section, challenges per pool", () => {
    expect(
      ["t-steps", "t-gaps", "t-opt", "t-check", "ch1"].map(
        (id) => info(id).number,
      ),
    ).toEqual([1, 2, 3, 1, 1]);
    expect(info("t-check").inCheckpoint).toBe(true);
    expect(info("ch1").challenge).toBe(true);
  });
  test("parts get letters only in groups", () => {
    const group = task("g", [part("a", "Antwort"), part("b", "Auswahl")]);
    const one = indexChapter({
      ...data,
      challenges: [group, task("s", [part("c", "Antwort")])],
    });
    expect(one.aufgaben.get("g")?.parts.map((p) => p.letter)).toEqual([
      "a",
      "b",
    ]);
    expect(one.aufgaben.get("s")?.parts.map((p) => p.letter)).toEqual([
      undefined,
    ]);
  });
});

describe("steps (::schritte)", () => {
  const stepsPart = () => info("t-steps").parts[0]!.part;

  test("only Mehr Unterstützung opens the steps from the start", () => {
    const state = emptyChapterState();
    state.modes.A = "unterstuetzung";
    expect(stepsOpenFromStart(stepsPart(), info("t-steps"), state)).toBe(true);
    state.modes.A = "uebung";
    expect(stepsOpenFromStart(stepsPart(), info("t-steps"), state)).toBe(false);
    state.modes.A = "challenges";
    expect(stepsOpenFromStart(stepsPart(), info("t-steps"), state)).toBe(false);
    // A part without steps has nothing to open.
    expect(
      stepsOpenFromStart(
        info("t-gaps").parts[0]!.part,
        info("t-gaps"),
        Object.assign(emptyChapterState(), { modes: { A: "unterstuetzung" } }),
      ),
    ).toBe(false);
  });

  test("steps are the last rung of the help, left out where they are already open", () => {
    const state = emptyChapterState();
    const kinds = () =>
      helpLadder(stepsPart(), info("t-steps"), state, data).map((s) => s.kind);
    state.modes.A = "uebung";
    expect(kinds()).toEqual(["tip", "rule", "steps"]);
    state.modes.A = "challenges";
    expect(kinds()).toEqual(["tip", "rule", "steps"]);
    state.modes.A = "unterstuetzung";
    expect(kinds()).toEqual(["tip"]);
  });

  test("the Merkkarte shows its rule at once where the steps are open", () => {
    const state = emptyChapterState();
    const tipStep = () =>
      helpLadder(stepsPart(), info("t-steps"), state, data)[0];
    state.modes.A = "unterstuetzung";
    expect(tipStep()?.merkkarte).toBe(2);
    state.modes.A = "uebung";
    expect(tipStep()?.merkkarte).toBe(1);
  });

  test("the steps appear once the help reaches them", () => {
    const state = emptyChapterState();
    state.modes.A = "uebung";
    const id = stepsPart().id;
    const shown = (count: number) =>
      stepsShown(stepsPart(), info("t-steps"), state, { [id]: count }, data);
    expect(shown(0)).toBe(false);
    expect(shown(2)).toBe(false);
    expect(shown(3)).toBe(true);
    state.modes.A = "unterstuetzung";
    expect(shown(0)).toBe(true);
  });

  test("the active step is the first one not yet right", () => {
    const part = stepsPart();
    const response = (states: Record<string, "richtig" | "nochNicht">) => ({
      value: undefined,
      wrongChecks: 0,
      steps: Object.fromEntries(
        Object.entries(states).map(([id, state]) => [
          id,
          { value: {}, lastCheck: { state } },
        ]),
      ),
    });
    expect(activeStep(part, response({}))).toBe(0);
    expect(activeStep(part, response({ s1: "nochNicht" }))).toBe(0);
    expect(activeStep(part, response({ s1: "richtig" }))).toBe(1);
    expect(activeStep(part, response({ s1: "richtig", s2: "richtig" }))).toBe(
      2,
    );
  });

  test("a right answer locks the answer field of a part with steps", () => {
    const right = {
      value: [1],
      wrongChecks: 0,
      lastCheck: { state: "richtig" },
    };
    expect(answerLocked(stepsPart(), right as PartResponse)).toBe(true);
    expect(
      answerLocked(stepsPart(), {
        ...right,
        lastCheck: { state: "nochNicht" },
      } as PartResponse),
    ).toBe(false);
    expect(
      answerLocked(info("t-check").parts[0]!.part, right as PartResponse),
    ).toBe(false);
  });

  test("the checkpoint has no help", () => {
    const entry = info("t-check").parts[0]!;
    expect(
      helpLadder(entry.part, info("t-check"), emptyChapterState(), data),
    ).toEqual([]);
  });

  test("a tip's Merkkarte link becomes the Merkkarte, not a second link", () => {
    const tip = tipOf(info("t-steps").parts[0]!.part, data.cards);
    expect(tip?.card?.title).toBe("Potenzregel");
    expect(tip?.content).toEqual(para("Denk an die Regel."));
  });
});

describe("optional tasks", () => {
  test("they fold in Mehr Challenges only", () => {
    const state = emptyChapterState();
    state.modes.A = "challenges";
    expect(isFoldedOptional(info("t-opt"), state, {})).toBe(true);
    expect(isFoldedOptional(info("t-opt"), state, { "t-opt": true })).toBe(
      false,
    );
    state.modes.A = "uebung";
    expect(isFoldedOptional(info("t-opt"), state, {})).toBe(false);
  });

  test("Mehr Challenges skips them for completion; Mehr Übung needs them", () => {
    const state = emptyChapterState();
    const section = sheetA.sections[0]!;
    const [steps, gaps] = [
      info("t-steps").parts[0]!.part,
      info("t-gaps").parts[0]!.part,
    ];
    for (const p of [steps, gaps]) {
      state.responses[p.id] = recordCheck(
        {
          value: p === gaps ? { "g-a": "x", "g-b": "y" } : [1],
          wrongChecks: 0,
        },
        { state: "richtig" },
      );
    }
    state.modes.A = "challenges";
    expect(sectionDone(sheetA, section, state)).toBe(true);
    state.modes.A = "uebung";
    // The optional task is an Auftrag: never checked, never needed.
    expect(sectionDone(sheetA, section, state)).toBe(true);
  });
});

describe("progress", () => {
  test("next section needs every gap checked, even when the answer is wrong", () => {
    const section = sheetA.sections[0]!;
    const state = emptyChapterState();
    state.modes.A = "uebung";
    state.responses["p-steps"] = recordCheck(
      { value: [1], wrongChecks: 0 },
      { state: "richtig" },
    );
    const partial = { "g-a": "wrong" };
    state.responses["p-gaps"] = recordCheck(
      { value: partial, wrongChecks: 0 },
      { state: "nochNicht" },
    );
    expect(sectionDone(sheetA, section, state)).toBe(false);
    const filled = { ...partial, "g-b": "wrong" };
    const checked = recordCheck(
      { value: filled, wrongChecks: 0 },
      { state: "nochNicht" },
    );
    state.responses["p-gaps"] = checked;
    expect(sectionDone(sheetA, section, state)).toBe(true);
    state.responses["p-gaps"] = {
      ...checked,
      value: { ...filled, "g-b": "changed" },
    };
    expect(sectionDone(sheetA, section, state)).toBe(false);
  });

  test("a sheet with a checkpoint is done once its Ampel is answered", () => {
    const state = emptyChapterState();
    expect(sheetDone(sheetA, state)).toBe(false);
    state.ampels.A = { level: "green" };
    expect(sheetDone(sheetA, state)).toBe(true);
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

describe("unlocking, challenges and recommendation", () => {
  test("the first sheet is open, the rest the teacher unlocks", () => {
    const state = emptyChapterState();
    expect(isUnlocked(data, sheetA, state)).toBe(true);
    expect(isUnlocked(data, sheetB, state)).toBe(false);
    state.unlocked.B = true;
    expect(isUnlocked(data, sheetB, state)).toBe(true);
  });

  test("in a session only the session's decisions count", () => {
    const state = emptyChapterState();
    state.unlocked.B = true;
    const inSession = (sessionSheets: Record<string, boolean>): SheetsData => ({
      ...data,
      sessionSheets,
    });
    expect(isUnlocked(inSession({}), sheetB, state)).toBe(false);
    expect(isUnlocked(inSession({ B: true }), sheetB, state)).toBe(true);
    expect(isUnlocked(inSession({}), sheetA, state)).toBe(true);
    expect(isUnlocked(inSession({ A: false }), sheetA, state)).toBe(false);
  });

  test("a challenge opens when the sheets of ::braucht are done", () => {
    const state = emptyChapterState();
    expect(challengeOpen(challenge, data, state)).toBe(false);
    expect(openChallenges(data, state)).toEqual([]);
    state.ampels.A = { level: "green" };
    expect(openChallenges(data, state)).toEqual([challenge]);
    expect(challengeOpen(task("free", []), data, emptyChapterState())).toBe(
      true,
    );
  });

  test("a locked recommended sheet falls back to the challenges", () => {
    const state = emptyChapterState();
    expect(recommendation(sheetA, data, state)).toEqual({ type: "challenges" });
    state.unlocked.B = true;
    expect(recommendation(sheetA, data, state)).toEqual({
      type: "sheet",
      sheetId: "B",
    });
    expect(recommendation(sheetB, data, state)).toEqual({ type: "challenges" });
  });
});

describe("solutions", () => {
  test("the teacher's decision wins over the server's", () => {
    const state = emptyChapterState();
    const solved = info("t-steps").aufgabe;
    expect(isReleased(solved, state, data)).toBe(false);
    expect(
      isReleased(solved, state, { ...data, releasedSolutions: ["t-steps"] }),
    ).toBe(true);
    state.released["t-steps"] = false;
    expect(
      isReleased(solved, state, { ...data, releasedSolutions: ["t-steps"] }),
    ).toBe(false);
    expect(
      isReleased(info("t-gaps").aufgabe, state, {
        ...data,
        releasedSolutions: ["t-gaps"],
      }),
    ).toBe(false);
  });
});
