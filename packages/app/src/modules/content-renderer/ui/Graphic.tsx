import { useMemo, useState, type ReactNode } from "react";
import {
  Coordinates,
  Mafs,
  Plot,
  Point,
  Text,
  usePaneContext,
  useTransformContext,
  vec,
} from "mafs";
import "mafs/core.css";
import TEXT from "./content.de.json";
import { evaluate, tryParse } from "../domain/evaluate";
import type { MathRow } from "@studyluma/catalog-contract";
import type { Graphic as GraphicSpec } from "../domain/rich";
import {
  formatPi,
  gridStep,
  labelStride,
  labelWidth,
  piTicks,
  spokenPi,
  type PiGrid,
} from "../domain/piMultiples";
import { snapToStep } from "../domain/sliders";
import { startValues, type PlotFit } from "../domain/graphicView";

/** A function entered by a learner, drawn above the authored curves. */
export type DrawnFunction = { row: MathRow; slot: number };

export type GraphicProps = {
  graphic: GraphicSpec;
  /** The text from `::grafik [Beschriftung](…)`; empty for `[]`. */
  title: string;
  drawn?: readonly DrawnFunction[];
};

const COLORS = 4;
const HEIGHT = 340;
/** Font size of the x axis labels in multiples of π, in px. */
const PI_LABEL_SIZE = 14;
/** Least space between two neighbouring π labels, in px. */
const PI_LABEL_GAP = 6;
const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 4 });

/** What a screen reader says when the author gave no text. */
export function describeGraphic(graphic: GraphicSpec): string {
  const show = (value: number, unit?: string) =>
    unit === "pi" ? formatPi(value) : number.format(value);
  const functions = graphic.graphs.map((g) => g.source).join("; ");
  const ranges = graphic.parameters.map((p) =>
    TEXT.graphic.range
      .replace("{name}", p.name)
      .replace("{from}", show(p.from, p.unit))
      .replace("{to}", show(p.to, p.unit)),
  );
  return [TEXT.graphic.alt.replace("{functions}", functions), ...ranges].join(
    ", ",
  );
}

/** The curve of a row in x and the parameters; `NaN` where it is undefined. */
function curveOf(row: MathRow, params: Record<string, number>) {
  const ast = tryParse(row);
  return ast ? (x: number) => evaluate(ast, { ...params, x }) : null;
}

type Curve = { name?: string | undefined; color: number; y: Fn | null };
type Fn = (x: number) => number;

/** The authored curves, with a name label at the right edge where it is in view. */
function Curves({
  curves,
  graphic,
  weight,
}: {
  curves: Curve[];
  graphic: GraphicSpec;
  weight: number;
}) {
  const [xMin, xMax] = graphic.axes.x;
  const [yMin, yMax] = graphic.axes.y;
  const labelX = xMax - (xMax - xMin) * 0.04;
  return (
    <>
      {curves.map(
        (curve, i) =>
          curve.y && (
            <Plot.OfX
              key={`g${i}`}
              y={curve.y}
              color={`var(--graphic-c${curve.color})`}
              weight={weight}
            />
          ),
      )}
      {curves.map((curve, i) => {
        const at = curve.y?.(labelX);
        return curve.name &&
          at !== undefined &&
          Number.isFinite(at) &&
          at > yMin &&
          at < yMax ? (
          <Text
            key={`n${i}`}
            x={labelX}
            y={at}
            attach="nw"
            color={`var(--graphic-c${curve.color})`}
          >
            {curve.name}
          </Text>
        ) : null;
      })}
    </>
  );
}

/**
 * The x axis labels of an `x-raster`: multiples of π, fractions stacked. Mafs
 * draws one line of text per label, so these are drawn here; the grid lines
 * stay Mafs'. Where the labels would touch, every second (fourth, …) is left
 * out, which keeps the round multiples.
 */
export function PiLabels({ grid }: { grid: PiGrid }) {
  const { viewTransform } = useTransformContext();
  const { xPaneRange } = usePaneContext();
  const ticks = piTicks(xPaneRange, grid);
  const step = gridStep(grid);
  const stepPx = Math.abs(
    vec.transform([step, 0], viewTransform)[0] -
      vec.transform([0, 0], viewTransform)[0],
  );
  const stride = labelStride(
    stepPx,
    Math.max(0, ...ticks.map((t) => labelWidth(t.label, PI_LABEL_SIZE))),
    PI_LABEL_GAP,
  );
  const top = 5;
  const bar = top + PI_LABEL_SIZE * 1.15;
  const text = {
    fontSize: PI_LABEL_SIZE,
    textAnchor: "middle",
    dominantBaseline: "hanging",
  } as const;
  return (
    <g className="mafs-shadow graphic__pi-labels">
      {ticks
        .filter((tick) => tick.k % stride === 0)
        .map(({ x, k, label }) => {
          const px = vec.transform([x, 0], viewTransform)[0];
          const half = labelWidth(label, PI_LABEL_SIZE) / 2 + 2;
          return (
            <g key={k}>
              <text x={px} y={top} {...text}>
                {label.top}
              </text>
              {label.bottom && (
                <>
                  <line
                    x1={px - half}
                    x2={px + half}
                    y1={bar}
                    y2={bar}
                    strokeWidth={1}
                  />
                  <text x={px} y={bar + 2} {...text}>
                    {label.bottom}
                  </text>
                </>
              )}
            </g>
          );
        })}
    </g>
  );
}

export function Points({ points }: { points: GraphicSpec["points"] }) {
  return (
    <>
      {points.map((p, i) => (
        <Point
          key={`p${i}`}
          x={p.position[0]}
          y={p.position[1]}
          color="var(--graphic-point)"
        />
      ))}
      {points.map(
        (p, i) =>
          p.name && (
            <Text
              key={`t${i}`}
              x={p.position[0]}
              y={p.position[1]}
              attach="ne"
              attachDistance={10}
            >
              {p.name}
            </Text>
          ),
      )}
    </>
  );
}

/** One slider with its name and value. */
export function SliderRow({
  parameter: p,
  value,
  onChange,
  fixed,
}: {
  parameter: GraphicSpec["parameters"][number];
  value: number;
  onChange: (value: number) => void;
  /** Only shows the value, as on the projector; the slider keeps its look. */
  fixed?: boolean;
}): ReactNode {
  const show = p.unit === "pi" ? formatPi : number.format;
  return (
    <label className="graphic__slider">
      <i className="graphic__name">{p.name}</i>
      <input
        type="range"
        min={p.from}
        max={p.to}
        step={p.step}
        value={value}
        {...(fixed ? { tabIndex: -1, "aria-readonly": true } : {})}
        className={fixed ? "is-fixed" : undefined}
        aria-valuetext={
          p.unit === "pi" ? spokenPi(value, TEXT.graphic.over) : undefined
        }
        onChange={(event) =>
          !fixed &&
          onChange(snapToStep(Number(event.target.value), p.from, p.to, p.step))
        }
      />
      <output>{show(value)}</output>
    </label>
  );
}

function Sliders({
  parameters,
  values,
  onChange,
}: {
  parameters: GraphicSpec["parameters"];
  values: Record<string, number>;
  onChange: (name: string, value: number) => void;
}): ReactNode {
  return (
    <div className="graphic__controls">
      {parameters.map((p) => (
        <SliderRow
          key={p.name}
          parameter={p}
          value={values[p.name] ?? p.start}
          onChange={(value) => onChange(p.name, value)}
        />
      ))}
    </div>
  );
}

/**
 * The coordinate system with the curves of a Grafik. `shown` hides single
 * curves; `fit` fixes the size and the visible y range of a Grafikfolie.
 */
export function GraphicPlot({
  graphic,
  values,
  label,
  shown,
  drawn = [],
  fit,
  weight = 2,
}: {
  graphic: GraphicSpec;
  values: Record<string, number>;
  label: string;
  shown?: readonly boolean[];
  drawn?: readonly DrawnFunction[];
  fit?: PlotFit;
  weight?: number;
}) {
  const curves = useMemo(
    () =>
      graphic.graphs.map((g, index) => ({
        name: g.name,
        color: index % COLORS,
        y: shown && shown[index] === false ? null : curveOf(g.row, values),
      })),
    [graphic.graphs, values, shown],
  );
  const view = fit
    ? { ...graphic, axes: { ...graphic.axes, y: fit.y } }
    : graphic;
  return (
    <div
      className="graphic__plot"
      role="img"
      aria-label={label}
      style={
        fit ? { width: fit.width, height: fit.height } : { minHeight: HEIGHT }
      }
    >
      <Mafs
        viewBox={{ x: view.axes.x, y: view.axes.y, padding: 0 }}
        preserveAspectRatio={false}
        height={fit ? fit.height : HEIGHT}
        pan={false}
        zoom={false}
      >
        {graphic.axes.xGrid ? (
          <>
            <Coordinates.Cartesian
              xAxis={{ lines: gridStep(graphic.axes.xGrid), labels: false }}
            />
            <PiLabels grid={graphic.axes.xGrid} />
          </>
        ) : (
          <Coordinates.Cartesian />
        )}
        <Curves curves={curves} graphic={view} weight={weight} />
        {drawn.map(({ row, slot }) => {
          const y = curveOf(row, {});
          return y ? (
            <Plot.OfX
              key={`d${slot}`}
              y={y}
              color={`var(--graphic-d${slot % COLORS})`}
              weight={weight + 1}
            />
          ) : null;
        })}
        <Points points={graphic.points} />
      </Mafs>
    </div>
  );
}

/**
 * A mathematical Grafik: curves, points and parameter sliders in a
 * coordinate system. Drawn with Mafs; the view is fixed to the authored axes.
 */
export function Graphic({ graphic, title, drawn = [] }: GraphicProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    startValues(graphic),
  );
  return (
    <figure className="graphic">
      <GraphicPlot
        graphic={graphic}
        values={values}
        label={title || describeGraphic(graphic)}
        drawn={drawn}
        weight={2}
      />
      {graphic.parameters.length > 0 && (
        <Sliders
          parameters={graphic.parameters}
          values={values}
          onChange={(name, value) =>
            setValues((old) => ({ ...old, [name]: value }))
          }
        />
      )}
      {title && <figcaption className="graphic__caption">{title}</figcaption>}
    </figure>
  );
}
