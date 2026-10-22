import { describe, expect, test } from "bun:test";
import type { Graphic } from "@studyluma/catalog-contract";
import {
  fitPlot,
  shownOf,
  slidersByGraph,
  valuesOf,
  withOwn,
} from "./graphicView";
import { typstToRow } from "@studyluma/catalog-contract";

const axes = { x: [-7, 7] as [number, number], y: [-8, 8] as [number, number] };

describe("fitPlot", () => {
  test("cuts y symmetrically when the height is short", () => {
    const fit = fitPlot(axes, 1400, 400);
    expect(fit.height).toBe(400);
    expect(fit.y[0]).toBeCloseTo(-2);
    expect(fit.y[1]).toBeCloseTo(2);
  });

  test("keeps the authored y and shrinks the height when there is room", () => {
    const fit = fitPlot({ ...axes, y: [-2, 2] }, 1400, 800);
    expect(fit.height).toBe(400);
    expect(fit.y).toEqual([-2, 2]);
  });
});

const graphic = (terms: [string, boolean?][]): Graphic => ({
  axes: { x: [-1, 1], y: [-1, 1] },
  graphs: terms.map(([term, visible]) => ({
    source: term,
    row: typstToRow(term),
    ...(visible === false ? { visible: false as const } : {}),
  })),
  points: [],
  parameters: [
    { name: "a", from: -1, to: 1, step: 0.1, start: 0 },
    { name: "b", from: 0, to: 2, step: 0.5, start: 1 },
    { name: "c", from: 0, to: 2, step: 0.5, start: 1 },
  ],
});

describe("Grafikfolie state", () => {
  const g = graphic([["sin(x)"], ["a * x + b", false], ["x"]]);

  test("sliders stand under the first line that uses them", () => {
    const rows = slidersByGraph(g).map((row) => row.map((p) => p.name));
    // c is used by no term and goes under the last line
    expect(rows).toEqual([[], ["a", "b"], ["c"]]);
  });

  test("the authored start and the lesson's changes", () => {
    expect(valuesOf(g)).toEqual({ a: 0, b: 1, c: 1 });
    expect(valuesOf(g, { values: { a: 0.5 } })).toEqual({ a: 0.5, b: 1, c: 1 });
    expect(shownOf(g)).toEqual([true, false, true]);
    expect(shownOf(g, { visible: { "1": true, "0": false } })).toEqual([
      false,
      true,
      true,
    ]);
  });

  test("functions typed in during the lesson follow the authored ones", () => {
    const square = typstToRow("x^2");
    const line = typstToRow("a x");
    const own = [{ row: square }, { row: line, hidden: true as const }];
    const all = withOwn(g, { own });
    expect(all.graphs.map((graph) => graph.row)).toEqual([
      ...g.graphs.map((graph) => graph.row),
      square,
      line,
    ]);
    expect(shownOf(g, { own })).toEqual([true, false, true, true, false]);
    expect(withOwn(g)).toBe(g);
  });
});
