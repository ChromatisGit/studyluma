import { describe, expect, test } from "bun:test";
import catalog from "./module";

const schema = catalog.config?.schema;

describe("catalog module declaration", () => {
  test("requires a config file and declares the build contribution and artifact", () => {
    expect(catalog.config?.required).toBe(true);
    expect(catalog.contributions).toEqual([
      {
        id: "catalog",
        module: "@studyluma/compiler/contribution",
        export: "default",
      },
    ]);
    expect(catalog.artifacts).toEqual([
      {
        id: "catalog",
        path: "catalog",
        validator: {
          module: "@studyluma/catalog-contract/validate",
          export: "validateCatalogArtifact",
        },
      },
    ]);
  });

  test("publication is explicit: courses have no default", () => {
    expect(schema?.safeParse({}).success).toBe(false);
    expect(schema?.safeParse({ courses: [] }).success).toBe(false);
    expect(schema?.parse({ courses: ["mathe-9"] })).toEqual({
      content: "content",
      courses: ["mathe-9"],
    });
  });

  test("the content root stays inside the instance; unknown keys are errors", () => {
    for (const content of ["/abs", "../up", "a/../b", "a\\b", "", "C:/x"]) {
      expect(schema?.safeParse({ content, courses: ["a"] }).success).toBe(
        false,
      );
    }
    expect(
      schema?.safeParse({ content: "sources/de", courses: ["a"] }).success,
    ).toBe(true);
    expect(schema?.safeParse({ courses: ["a"], extra: 1 }).success).toBe(false);
    expect(schema?.safeParse({ courses: ["a", "a"] }).success).toBe(false);
  });
});
