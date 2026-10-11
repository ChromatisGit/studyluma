/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "bun:test";
import type { Worksheet } from "../../catalog";
import { gap, inline, para, part, task } from "../../../test/catalog";
import { emptyChapterState } from "./chapterState";
import type { PartResponse } from "./contract";
import {
  baseLevel,
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
  structureLevel,
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
      level: 2,
      kind: "rechenweg",
      items: [
        {
          id: "s1",
          content: [{ type: "text", value: "Exponent: " }, gap("g1", "4")],
        },
        { id: "s2", content: inline("Ableitung angeben") },
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

const stepsTask = task("t-steps", [withTip()], {
  struktur: { unterstuetzung: "rechenweg", uebung: "plan" },
});
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

describe("support levels (::schritte)", () => {
  test("the mode picks the visible support from the task's struktur", () => {
    const state = emptyChapterState();
    state.modes.A = "unterstuetzung";
    expect(baseLevel(info("t-steps"), state)).toBe(2);
    state.modes.A = "uebung";
    expect(baseLevel(info("t-steps"), state)).toBe(1);
    state.modes.A = "challenges";
    expect(baseLevel(info("t-steps"), state)).toBe(0);
  });

  test("steps stay available on demand: the ladder leaves out only what is shown", () => {
    const state = emptyChapterState();
    const [entry] = info("t-steps").parts;
    state.modes.A = "challenges";
    expect(
      helpLadder(entry!.part, info("t-steps"), state, data).map((s) => s.kind),
    ).toEqual(["tip", "rule", "example", "plan", "rechenweg"]);
    state.modes.A = "uebung";
    expect(
      helpLadder(entry!.part, info("t-steps"), state, data).map((s) => s.kind),
    ).toEqual(["tip", "example", "rechenweg"]);
  });

  test("a Plan has no Rechenweg to ask for", () => {
    const plan = part("p-plan", "Antwort", {
      steps: {
        level: 0,
        kind: "plan",
        items: [{ id: "x", content: inline("a") }],
      },
    });
    const planTask = task("t-plan", [plan]);
    const local = indexChapter({ ...data, challenges: [planTask] });
    expect(
      helpLadder(
        plan,
        local.aufgaben.get("t-plan")!,
        emptyChapterState(),
        data,
      ).map((s) => s.kind),
    ).toEqual(["plan"]);
  });

  test("help raises the structure level", () => {
    const state = emptyChapterState();
    state.modes.A = "challenges";
    const id = info("t-steps").parts[0]!.part.id;
    expect(structureLevel(info("t-steps"), state, { [id]: 4 }, data)).toBe(1);
    expect(structureLevel(info("t-steps"), state, { [id]: 5 }, data)).toBe(2);
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
