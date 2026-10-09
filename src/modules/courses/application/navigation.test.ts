import { describe, expect, test } from "bun:test";
import type { Course } from "../domain/course";
import { chaptersInOrder, chapterPath, neighbours } from "./navigation";

const course: Course = {
  id: "ma",
  title: "Mathe",
  badge: "MA",
  currentChapterId: "2-1",
  phases: [],
  topics: [
    {
      id: "a",
      number: "1",
      title: "A",
      chapters: [{ id: "1-1", number: "1.1", title: "x" }],
    },
    {
      id: "b",
      number: "2",
      title: "B",
      chapters: [
        { id: "2-1", number: "2.1", title: "y" },
        { id: "2-2", number: "2.2", title: "z" },
      ],
    },
  ],
};

describe("course navigation", () => {
  test("chapters up to the class position are reached", () => {
    const chapters = chaptersInOrder(course);
    expect(chapters.map((chapter) => chapter.reached)).toEqual([
      true,
      true,
      false,
    ]);
    expect(chapters[1]?.current).toBe(true);
    expect(chapters[2]?.topic.id).toBe("b");
  });

  test("without a position every chapter is reached", () => {
    const chapters = chaptersInOrder({ ...course, currentChapterId: null });
    expect(chapters.every((chapter) => chapter.reached)).toBe(true);
  });

  test("neighbours cross topic boundaries", () => {
    expect(neighbours(course, "2-1").previous?.id).toBe("1-1");
    expect(neighbours(course, "2-1").next?.id).toBe("2-2");
    expect(neighbours(course, "1-1").previous).toBeUndefined();
  });

  test("paths are English and encoded", () => {
    expect(chapterPath("ma 1", "2-1")).toBe("/courses/ma%201/chapters/2-1");
  });
});
