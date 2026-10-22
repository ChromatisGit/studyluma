import { describe, expect, test } from "bun:test";
import { componentProblems, defineComponent } from "../src";

const base = {
  name: "probe",
  placements: ["text"] as const,
  compile: () => ({}),
  description: () => "Probe",
};

describe("defineComponent", () => {
  test("fills in the defaults and freezes the definition", () => {
    const definition = defineComponent(base);
    expect(definition.version).toBe("1");
    expect(definition.keys).toEqual([]);
    expect(definition.graphic).toBe(false);
    expect(Object.isFrozen(definition)).toBe(true);
  });

  test("refuses an unusable definition and names every problem", () => {
    expect(() =>
      defineComponent({ ...base, name: "Probe", placements: [] }),
    ).toThrow(/name must be lowercase.*placements must list/);
  });

  test.each([
    ["a name with capitals", { ...base, name: "Symmetrie" }],
    ["an unknown placement", { ...base, placements: ["seite"] }],
    ["a Grafik block as own key", { ...base, keys: ["graph"] }],
    ["a missing compile", { ...base, compile: undefined }],
    ["an empty version", { ...base, version: "" }],
  ])("reports %s", (_name, value) => {
    expect(componentProblems(value)).not.toEqual([]);
  });

  test("accepts a complete definition", () => {
    expect(
      componentProblems({ ...base, keys: ["modus"], graphic: true }),
    ).toEqual([]);
  });
});
