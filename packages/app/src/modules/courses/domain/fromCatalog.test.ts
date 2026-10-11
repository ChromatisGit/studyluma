import { describe, expect, test } from "bun:test";
import { catalog } from "../../../test/catalog";
import { coursesFromCatalog } from "./fromCatalog";

const chapter = (id: string, topic: string, name: string) => ({
  id,
  group: "g",
  topic,
  name,
  title: `Kapitel ${name}`,
  worksheetIds: [],
  quizIds: [],
  foliensatzIds: [],
});

describe("courses from the catalog", () => {
  const data = catalog({
    topics: [
      {
        id: "t1",
        group: "g",
        folder: "terme",
        title: "Terme",
        icon: { gallery: "terme" },
      },
      {
        id: "t2",
        group: "g",
        folder: "funktionen",
        title: "Funktionen",
        icon: { assetId: "asset_1" },
      },
    ],
    chapters: [
      chapter("c1", "terme", "a"),
      chapter("c2", "terme", "b"),
      chapter("c3", "funktionen", "c"),
    ],
    courses: [
      {
        id: "mathe",
        title: "Mathe Klasse",
        topics: [
          { topicId: "t1", chapterIds: ["c2", "c1"] },
          { topicId: "t2", chapterIds: ["c3"] },
        ],
      },
    ],
  });

  test("topics and chapters follow the course file and are numbered by it", () => {
    const [course] = coursesFromCatalog(data);
    expect(course?.topics.map((t) => [t.number, t.title])).toEqual([
      ["1", "Terme"],
      ["2", "Funktionen"],
    ]);
    expect(course?.topics[0]?.chapters.map((c) => [c.number, c.id])).toEqual([
      ["1.1", "c2"],
      ["1.2", "c1"],
    ]);
    expect(course?.currentChapterId).toBe("c2");
    expect(course?.badge).toBe("MK");
  });

  test("a topic's icon is its gallery id or its own svg", () => {
    const [course] = coursesFromCatalog(data);
    expect(course?.topics.map((t) => t.icon)).toEqual([
      { gallery: "terme" },
      { assetId: "asset_1" },
    ]);
  });
});
