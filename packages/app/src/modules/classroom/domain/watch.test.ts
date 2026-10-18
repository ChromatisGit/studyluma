import { describe, expect, test } from "bun:test";
import type { Snapshot } from "./protocol";
import { observe, WATCH_START } from "./watch";

const running = { status: "running" } as unknown as Snapshot;
const ended = { status: "ended" } as unknown as Snapshot;

describe("observe", () => {
  test("no session yet is shown, not the end", () => {
    expect(observe(WATCH_START, null)).toEqual({
      watch: WATCH_START,
      adopt: true,
      over: false,
    });
  });

  test("a running session is remembered", () => {
    const seen = observe(WATCH_START, running);
    expect(seen).toEqual({
      watch: { seen: true, missing: 0 },
      adopt: true,
      over: false,
    });
  });

  test("one miss after a session is a hiccup, the second is the end", () => {
    const first = observe({ seen: true, missing: 0 }, null);
    expect(first).toEqual({
      watch: { seen: true, missing: 1 },
      adopt: false,
      over: false,
    });
    expect(observe(first.watch, null).over).toBe(true);
  });

  test("a snapshot in between resets the misses", () => {
    const first = observe({ seen: true, missing: 0 }, null);
    const back = observe(first.watch, running);
    expect(back.watch.missing).toBe(0);
    expect(observe(back.watch, null).over).toBe(false);
  });

  test("the ended snapshot is shown and ends the connection", () => {
    expect(observe({ seen: true, missing: 0 }, ended)).toEqual({
      watch: { seen: true, missing: 0 },
      adopt: true,
      over: true,
    });
  });
});
