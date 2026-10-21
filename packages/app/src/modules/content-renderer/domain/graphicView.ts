import type { Graphic } from "@studyluma/catalog-contract";
import { tryParse, variablesIn } from "./evaluate";
import { snapToStep } from "./sliders";

export type PlotFit = {
  /** Size of the plot in px. */
  width: number;
  height: number;
  /** The y range that is visible; the x range is always the authored one. */
  y: [number, number];
};

/**
 * One unit is as long on y as on x. The authored x range takes the full
 * width; the authored y range is shown completely when it fits in the
 * height (the plot then gets only the height it needs) and is cut
 * symmetrically around its middle when it does not.
 */
export function fitPlot(
  axes: { x: [number, number]; y: [number, number] },
  width: number,
  height: number,
): PlotFit {
  const unit = width / (axes.x[1] - axes.x[0]);
  const needed = unit * (axes.y[1] - axes.y[0]);
  if (needed <= height) {
    return { width, height: needed, y: axes.y };
  }
  const middle = (axes.y[0] + axes.y[1]) / 2;
  const half = height / unit / 2;
  return { width, height, y: [middle - half, middle + half] };
}

/** What a lesson changed on a Grafikfolie; whatever is missing stays as authored. */
export type GraphicChanges = {
  values?: Record<string, number>;
  /** By index of the graph. */
  visible?: Record<string, boolean>;
};

/** The sliders at their authored start. */
export function startValues(graphic: Graphic): Record<string, number> {
  return Object.fromEntries(
    graphic.parameters.map((p) => [
      p.name,
      snapToStep(p.start, p.from, p.to, p.step),
    ]),
  );
}

/** The slider values of a Grafikfolie: the start, then what the lesson changed. */
export function valuesOf(
  graphic: Graphic,
  changes?: GraphicChanges,
): Record<string, number> {
  return { ...startValues(graphic), ...changes?.values };
}

/** Per graph whether it is drawn: the authored start, then what the lesson changed. */
export function shownOf(graphic: Graphic, changes?: GraphicChanges): boolean[] {
  return graphic.graphs.map(
    (g, index) => changes?.visible?.[index] ?? g.visible !== false,
  );
}

/**
 * The sliders under the line of each graph: a slider stands under the first
 * graph whose term uses its parameter, one that no term uses under the last.
 */
export function slidersByGraph(graphic: Graphic): Graphic["parameters"][] {
  const rows = graphic.graphs.map((): Graphic["parameters"] => []);
  const uses = graphic.graphs.map((g) => {
    const ast = tryParse(g.row);
    return ast ? variablesIn(ast) : [];
  });
  for (const parameter of graphic.parameters) {
    const first = uses.findIndex((names) => names.includes(parameter.name));
    rows[first >= 0 ? first : rows.length - 1]?.push(parameter);
  }
  return rows;
}
