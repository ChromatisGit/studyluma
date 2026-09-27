import { describe, expect, test } from "bun:test";
import type { Chapter } from "../../content";
import { chapterPath, groupChapters } from "./navigation";

describe("complete Demo-shaped course navigation", () => {
  test("keeps two topics and all six chapters independently reachable", () => {
    const topics = [
      [
        "terme-gleichungen",
        ["terme-umformen", "binomische-formeln", "bruchrechnung"],
      ],
      [
        "vektorgeometrie",
        ["geraden", "lineare-abhaengigkeit", "lage-geraden"],
      ],
    ] as const;
    const chapters: Chapter[] = topics.flatMap(([topic, ids]) =>
      ids.map((id) => ({
        id,
        title: id,
        body: "",
        topic_id: topic,
        topic_title: topic,
      })),
    );
    const groups = groupChapters(chapters);
    expect(groups.map((group) => group.chapters.length)).toEqual([3, 3]);
    expect(
      new Set(chapters.map((chapter) => chapterPath("demo-math", chapter))).size,
    ).toBe(6);
    const last = chapters.at(-1);
    expect(last).toBeDefined();
    if (!last) return;
    expect(chapterPath("demo-math", last)).toContain(
      "/topics/vektorgeometrie/chapters/lage-geraden",
    );
  });
});
