import { defineComponent } from "@studyluma/component-api";
import type { ProbeProps } from "./types";

/**
 * The Development instance's test component: a point that walks along the
 * first graph of its file. It runs every path of the component mechanism:
 * own keys, the Grafik blocks, its own errors and warnings, text and slide,
 * and state the projector mirrors.
 */
export default defineComponent<ProbeProps>({
  name: "probe",
  placements: ["text", "folie"],
  keys: ["start"],
  graphic: true,
  compile(file, context) {
    const graphic = context.graphic(file);
    const start = file.start ?? 0;
    if (typeof start !== "number" || !Number.isInteger(start)) {
      context.error("PROBE_START", "start must be a whole number");
      return undefined;
    }
    if (!graphic) {
      return undefined;
    }
    if (graphic.graphs.length !== 1) {
      context.error("PROBE_GRAPH", "probe needs exactly one [[graph]]");
      return undefined;
    }
    const [from, to] = graphic.axes.x;
    if (start < from || start > to) {
      context.warn(
        "PROBE_RANGE",
        `start ${start} lies outside x = [${from}, ${to}]`,
      );
    }
    return { graphic, start };
  },
  description: ({ graphic }) =>
    `Punkt auf dem Graphen von ${graphic.graphs[0]?.source ?? ""}`,
});
