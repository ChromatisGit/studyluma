/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "bun:test";
import { catalog, entry, para, placement, set } from "../../../test/catalog";
import { deviation, formatSeconds, plannedEnd } from "./clock";
import { buildDeck, plannedTimes, presentationFor } from "./deck";
import { isFill, isWritingSlide, runningOrder, slideTab } from "./layout";
import { newDeckState, reduceSession, strokeAt } from "./session";

/**
 * Stunde: Einstieg (bis 4:00), Baustein (bis 8:00), Inhalt
 * Baustein:   Merkkarte, Quiz (bis 2:00)
 */
const quiz = {
  id: "q1",
  chapterId: "c1",
  filename: "Quiz",
  title: "Das Quiz",
  questions: [],
};
const merkkarten = [
  {
    id: "m1",
    title: "Regel",
    anchor: "regel",
    rule: para("Regel"),
    examples: [],
  },
];
const data = catalog({
  summaries: [
    {
      id: "s1",
      chapterId: "c1",
      title: "Der Inhalt",
      content: [],
      merkkarten,
    },
  ],
  quizzes: [quiz],
  foliensaetze: [
    set("root", "Stunde", [
      entry("e1", "slide", { title: "Einstieg", until: 240 }),
      entry("e2", "foliensatz", {
        targetId: "baustein",
        until: 480,
        notes: para("Baustein erläutern"),
      }),
      entry("e3", "summary", { targetId: "s1" }),
    ]),
    set("baustein", "Baustein", [
      entry("b1", "merkkarte", { targetId: "m1", notes: para("Regel zeigen") }),
      entry("b2", "quiz", { targetId: "q1", until: 120 }),
    ]),
  ],
  presentations: [
    {
      id: "p1",
      rootFoliensatzId: "root",
      chapterId: "c1",
      title: "Stunde",
      placements: [
        placement("p1-e1", "e1", ["root", "e1"], {
          title: "Einstieg",
          until: 240,
        }),
        placement("p1-b1", "b1", ["root", "e2", "b1"], {
          kind: "merkkarte",
          targetId: "m1",
          noteSourceEntryIds: ["e2"],
        }),
        placement("p1-b2", "b2", ["root", "e2", "b2"], {
          kind: "quiz",
          targetId: "q1",
          until: 120,
        }),
        placement("p1-e3", "e3", ["root", "e3"], {
          kind: "summary",
          targetId: "s1",
        }),
      ],
    },
  ],
});
const deck = buildDeck(data, "p1")!;

describe("buildDeck", () => {
  test("slides follow the placements and name where they come from", () => {
    expect(deck.slides.map((s) => [s.number, s.kind, s.title])).toEqual([
      [1, "slide", "Einstieg"],
      [2, "merkkarte", "Regel"],
      [3, "quiz", "Das Quiz"],
      [4, "summary", "Der Inhalt"],
    ]);
    expect(deck.slides.map((s) => s.from)).toEqual([
      [],
      ["Baustein"],
      ["Baustein"],
      [],
    ]);
    expect(deck.slides[1]?.merkkarte?.id).toBe("m1");
    expect(deck.slides[2]?.quiz?.id).toBe("q1");
    expect(deck.slides[3]?.summary?.id).toBe("s1");
  });

  test("notes of the including entry come first, then the slide's own", () => {
    const text = (index: number) => JSON.stringify(deck.slides[index]?.notes);
    expect(text(1).indexOf("Baustein erläutern")).toBeLessThan(
      text(1).indexOf("Regel zeigen"),
    );
    expect(deck.slides[0]?.notes).toEqual([]);
  });

  test("::bis inside a Baustein counts from where the Baustein starts", () => {
    // Einstieg ends at 4:00; the Baustein's 2:00 is 6:00 on the lesson clock.
    expect(deck.slides.map((s) => s.planUntil)).toEqual([
      240,
      undefined,
      360,
      undefined,
    ]);
    const times = plannedTimes(data, data.foliensaetze[0]!);
    expect([...times.values()]).toEqual([240, 360]);
  });

  test("an unknown presentation has no deck", () => {
    expect(buildDeck(data, "missing")).toBeUndefined();
  });

  test("the lesson starts the requested presentation or the first one in the overview", () => {
    expect(presentationFor(data, "c1", null)?.id).toBe("p1");
    expect(presentationFor(data, "c1", "p1")?.id).toBe("p1");
    expect(presentationFor(data, "other", null)).toBeUndefined();
  });
});

describe("layout", () => {
  test("a segment of only a cover image fills its place", () => {
    const cover = {
      type: "content" as const,
      content: [
        {
          type: "paragraph" as const,
          children: [
            {
              type: "image" as const,
              assetId: "a",
              alt: "",
              fit: "cover" as const,
            },
          ],
        },
      ],
    };
    expect(isFill(cover)).toBe(true);
    expect(
      isFill({
        type: "content",
        content: [
          {
            type: "paragraph",
            children: [
              { type: "image", assetId: "a", alt: "", fit: "contain" },
            ],
          },
        ],
      }),
    ).toBe(false);
    expect(isFill({ type: "content", content: para("Text") })).toBe(false);
  });
});

describe("lesson clock", () => {
  test("slides without ::bis keep the previous plan", () => {
    expect(plannedEnd(deck, "p1-b1")).toBe(240);
    expect(plannedEnd(deck, "p1-b2")).toBe(360);
    expect(plannedEnd(deck, "p1-e3")).toBe(360);
  });

  test("deviation grows once time passes the planned end", () => {
    const slide = deck.slides[2]!;
    // Planned from 4:00 to 6:00, entered at 5:40, now 7:20: entered 1:40 late.
    expect(formatSeconds(deviation(deck, slide, 340, 440), true)).toBe("+1:40");
    // Once the planned end has passed by more than that, the overrun counts.
    expect(formatSeconds(deviation(deck, slide, 240, 500), true)).toBe("+2:20");
  });
});

describe("session", () => {
  const start = newDeckState(deck);
  const at2 = reduceSession(deck, start, {
    type: "go",
    frameId: "p1-b1",
    now: 100,
  });

  test("a deck starts on its first slide", () => {
    expect(start.currentFrameId).toBe("p1-e1");
  });

  test("a blank hangs after the current slide and is labelled 2a", () => {
    const branched = reduceSession(deck, at2, { type: "addBlank", now: 120 });
    const order = runningOrder(deck, branched.blanks);
    const blank = order.find((item) => item.kind === "blank");
    expect(blank?.kind === "blank" && blank.label).toBe("2a");
    expect(branched.currentFrameId).toBe(
      blank?.kind === "blank" ? blank.blank.id : "",
    );
    const next = reduceSession(deck, branched, {
      type: "step",
      by: 1,
      now: 130,
    });
    expect(next.currentFrameId).toBe("p1-b2");
  });

  test("undo on an empty blank removes it and returns to its slide", () => {
    const branched = reduceSession(deck, at2, { type: "addBlank", now: 120 });
    const back = reduceSession(deck, branched, { type: "undo", now: 125 });
    expect(back.blanks).toEqual([]);
    expect(back.currentFrameId).toBe("p1-b1");
  });

  test("undo takes back the last stroke of the current slide", () => {
    const stroke = {
      id: "k1",
      frameId: "p1-b1",
      color: "graphit" as const,
      points: [[10, 10]] as [number, number][],
    };
    const written = reduceSession(deck, at2, { type: "stroke", stroke });
    expect(
      reduceSession(deck, written, { type: "undo", now: 130 }).ink,
    ).toEqual([]);
    expect(strokeAt(written.ink, 15, 12)?.id).toBe("k1");
  });
});

describe("slides on the stage", () => {
  test("a slide plans the time between its ::bis and the previous one", () => {
    expect(deck.slides.map((s) => s.budget)).toEqual([
      240,
      undefined,
      120,
      undefined,
    ]);
  });

  test("the tab shows what happens: the function of embedded entries, the author's tag on slides", () => {
    expect(slideTab(deck.slides[1]!)).toEqual({
      label: "Merkkarte",
      tone: "merke",
    });
    expect(slideTab(deck.slides[2]!)).toEqual({ label: "Quiz", tone: "quiz" });
    expect(slideTab(deck.slides[3]!)).toEqual({
      label: "Inhalt",
      tone: "inhalt",
    });
    const tagged = {
      ...deck.slides[0]!,
      tag: { label: "Aufgabe", tone: "aufgabe" as const },
    };
    expect(slideTab(tagged)).toEqual({ label: "Aufgabe", tone: "aufgabe" });
    expect(slideTab(deck.slides[0]!).tone).toBe("neutral");
  });

  test("a slide with ::platz keeps its text compact for writing", () => {
    const space = { type: "space" as const, size: 1 };
    const writing = {
      ...deck.slides[0]!,
      segments: [{ type: "content" as const, content: [space] }],
    };
    const columns = {
      ...deck.slides[0]!,
      segments: [
        {
          type: "columns" as const,
          columns: [{ width: 1, content: [space] }],
        },
      ],
    };
    expect(isWritingSlide(deck.slides[0]!)).toBe(false);
    expect(isWritingSlide(writing)).toBe(true);
    expect(isWritingSlide(columns)).toBe(true);
  });

  test("the Merkkarten placed in a slide's text come with the slide", () => {
    const placed = catalog({
      ...data,
      foliensaetze: [
        set("root", "Stunde", [
          entry("e1", "slide", {
            title: "Regel",
            segments: [
              {
                type: "content",
                content: [{ type: "merkkarteCard", targetId: "m1" }],
              },
            ],
          }),
        ]),
      ],
      presentations: [
        {
          id: "p2",
          rootFoliensatzId: "root",
          chapterId: "c1",
          title: "Stunde",
          placements: [
            placement("p2-e1", "e1", ["root", "e1"], { title: "Regel" }),
          ],
        },
      ],
    });
    expect(Object.keys(buildDeck(placed, "p2")!.slides[0]!.cards)).toEqual([
      "m1",
    ]);
  });
});

describe("worksheet on the projector", () => {
  const at = (frameId: string) =>
    reduceSession(deck, newDeckState(deck), {
      type: "go",
      frameId,
      now: 1,
    });

  test("showing the worksheet toggles per slide", () => {
    const shown = reduceSession(deck, at("p1-e1"), {
      type: "toggleSheet",
      frameId: "p1-e1",
    });
    expect(shown.sheetShown).toBe("p1-e1");
    expect(
      reduceSession(deck, shown, { type: "toggleSheet", frameId: "p1-e1" })
        .sheetShown,
    ).toBeNull();
  });

  test("a task taken from the worksheet becomes a blank surface that remembers it", () => {
    const task = { sheetId: "w1", taskId: "t1" };
    const next = reduceSession(deck, at("p1-e1"), {
      type: "addBlank",
      now: 5,
      task,
    });
    expect(next.blanks[0]?.task).toEqual(task);
    expect(next.currentFrameId).toBe(next.blanks[0]!.id);
  });
});
