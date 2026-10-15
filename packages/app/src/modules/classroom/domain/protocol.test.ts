import { describe, expect, test } from "bun:test";
import { parseClientMessage } from "./protocol";

const frame = (intent: unknown) => JSON.stringify({ type: "intent", intent });

describe("client messages", () => {
  test("a sent sheet and its withdrawal are valid", () => {
    const target = { kind: "sheet", id: "s1", chapterId: "c1" } as const;
    expect(parseClientMessage(frame({ type: "target", target }))).toEqual({
      type: "intent",
      intent: { type: "target", target },
    });
    expect(parseClientMessage(frame({ type: "target", target: null }))).toEqual(
      { type: "intent", intent: { type: "target", target: null } },
    );
  });

  test("a malformed target is not a message", () => {
    for (const target of [
      {},
      { kind: "quiz", id: "s1", chapterId: "c1" },
      { kind: "sheet", id: "", chapterId: "c1" },
      { kind: "sheet", id: "s1" },
      "s1",
    ]) {
      expect(parseClientMessage(frame({ type: "target", target }))).toBeNull();
    }
  });

  test("releasing a sheet is not available over the socket", () => {
    expect(
      parseClientMessage(
        frame({ type: "release.sheet", sheetId: "s1", released: true }),
      ),
    ).toBeNull();
  });

  test("progress and Ampel reports are checked", () => {
    const progress = {
      type: "progress" as const,
      sheetId: "s1",
      reached: 2,
      done: true,
      challenges: false,
    };
    expect(parseClientMessage(frame(progress))).toEqual({
      type: "intent",
      intent: progress,
    });
    for (const bad of [
      { ...progress, reached: -1 },
      { ...progress, reached: 100 },
      { ...progress, reached: 1.5 },
      { ...progress, done: "yes" },
      { ...progress, sheetId: "" },
    ]) {
      expect(parseClientMessage(frame(bad))).toBeNull();
    }
    const ampel = {
      type: "ampel" as const,
      sheetId: "s1",
      level: "yellow" as const,
      causes: ["task" as const, "other" as const],
    };
    expect(parseClientMessage(frame(ampel))).toEqual({
      type: "intent",
      intent: ampel,
    });
    for (const bad of [
      { ...ampel, level: "blue" },
      { ...ampel, causes: ["boredom"] },
      { ...ampel, causes: "task" },
    ]) {
      expect(parseClientMessage(frame(bad))).toBeNull();
    }
  });
});
