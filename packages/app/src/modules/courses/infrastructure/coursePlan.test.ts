import { describe, expect, test } from "bun:test";
import {
  coursePlanCookie,
  readCoursePlan,
  type CoursePlan,
} from "./coursePlan";

const encode = (value: unknown) =>
  btoa(JSON.stringify(value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const withCookie = (value: string) =>
  new Request("http://site/", {
    headers: { cookie: `studyluma-course-plan=${value}` },
  });

const empty = { courseId: "c1", topics: [], chapters: [] };

describe("the course plan cookie", () => {
  test("a plan survives a round trip, umlauts included", () => {
    const plan: CoursePlan = {
      courseId: "c1",
      topics: [],
      chapters: [{ id: "x", title: "Übungen für Größe", topicId: "t" }],
      names: { x: "Prüfung" },
    };
    const setCookie = coursePlanCookie(new Request("http://site/"), plan);
    const value = setCookie.split(";")[0]?.split("=").slice(1).join("=") ?? "";
    expect(readCoursePlan(withCookie(value), "c1")).toEqual(plan);
  });

  test("plans of other courses are kept when one is saved", () => {
    const first = coursePlanCookie(new Request("http://site/"), {
      ...empty,
      courseId: "a",
      removed: ["r"],
    });
    const request = withCookie(first.split(";")[0]?.split("=")[1] ?? "");
    const second = coursePlanCookie(request, { ...empty, courseId: "b" });
    const again = withCookie(second.split(";")[0]?.split("=")[1] ?? "");
    expect(readCoursePlan(again, "a").removed).toEqual(["r"]);
  });

  test.each([
    ["not base64", "%%%"],
    ["not JSON", encode("x").slice(0, 2)],
    ["not an object", encode([1, 2])],
    ["a plan without topics", encode({ c1: { courseId: "c1" } })],
    ["a plan of another course", encode({ c1: { ...empty, courseId: "c2" } })],
    ["topics that are no topics", encode({ c1: { ...empty, topics: [1] } })],
    ["a removed list of numbers", encode({ c1: { ...empty, removed: [1] } })],
    [
      "names that are no strings",
      encode({ c1: { ...empty, names: { a: 1 } } }),
    ],
  ])("%s is ignored instead of breaking the site", (_, value) => {
    expect(readCoursePlan(withCookie(value), "c1")).toEqual(empty);
  });
});
