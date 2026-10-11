import { describe, expect, test } from "bun:test";
import type { SummaryRule } from "../../catalog";
import { summariesToRelease } from "./summaryRules";

const order = ["a", "b", "c", "d"];
const run = (
  from: string | null,
  to: string | null,
  rules: Record<string, SummaryRule>,
  closed: (id: string) => boolean = () => true,
) =>
  summariesToRelease({
    order,
    from,
    to,
    rule: (id) => rules[id] ?? "manuell",
    closed,
  });

describe("Inhalt release rules", () => {
  test("'mit dem Kapitel' opens a chapter as the class reaches it", () => {
    expect(run("a", "c", { b: "kapitel", c: "kapitel", a: "kapitel" })).toEqual(
      ["b", "c"],
    );
  });
  test("'nach Abschluss' opens a chapter once the class has left it", () => {
    expect(
      run("a", "c", { a: "abschluss", b: "abschluss", c: "abschluss" }),
    ).toEqual(["a", "b"]);
  });
  test("'manuell' never opens by itself", () => {
    expect(run("a", "d", {})).toEqual([]);
  });
  test("moving back or staying opens nothing", () => {
    expect(run("c", "a", { a: "kapitel", b: "kapitel" })).toEqual([]);
    expect(run("b", "b", { b: "kapitel" })).toEqual([]);
  });
  test("chapters without an Inhalt or already open are skipped", () => {
    expect(
      run("a", "c", { b: "kapitel", c: "kapitel" }, (id) => id !== "b"),
    ).toEqual(["c"]);
  });
  test("with no position yet, the first move opens from the start", () => {
    expect(run(null, "b", { a: "kapitel", b: "kapitel" })).toEqual(["a", "b"]);
  });
});
