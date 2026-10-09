import { useMemo, useState, type ReactNode } from "react";
import { Coordinates, Mafs, Plot, Point, Text } from "mafs";
import "mafs/core.css";
import { evaluate, tryParse } from "../domain/evaluate";
import type { MathRow } from "../domain/mathNodes";
import type { Graphic as GraphicSpec } from "../domain/rich";

/** A function entered by a learner, drawn above the authored curves. */
export type DrawnFunction = { row: MathRow; slot: number };

export type GraphicProps = {
  graphic: GraphicSpec;
  /** The description from `::grafik [Beschreibung](…)`. */
  title: string;
  drawn?: readonly DrawnFunction[];
};

const COLORS = 4;
const HEIGHT = 340;
const number = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 4 });

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
}: {
  curves: Curve[];
  graphic: GraphicSpec;
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

function Points({ points }: { points: GraphicSpec["points"] }) {
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
        <label key={p.name} className="graphic__slider">
          <i className="graphic__name">{p.name}</i>
          <input
            type="range"
            min={p.from}
            max={p.to}
            step={p.step}
            value={values[p.name]}
            onChange={(event) => onChange(p.name, Number(event.target.value))}
          />
          <output>{number.format(values[p.name] ?? p.start)}</output>
        </label>
      ))}
    </div>
  );
}

/**
 * A mathematical Grafik: curves, points and parameter sliders in a
 * coordinate system. Drawn with Mafs; the view is fixed to the authored axes.
 */
export function Graphic({ graphic, title, drawn = [] }: GraphicProps) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(graphic.parameters.map((p) => [p.name, p.start])),
  );
  const curves = useMemo(
    () =>
      graphic.graphs.map((g, index) => ({
        name: g.name,
        color: index % COLORS,
        y: curveOf(g.row, values),
      })),
    [graphic.graphs, values],
  );
  return (
    <figure className="graphic">
      <div
        className="graphic__plot"
        role="img"
        aria-label={title}
        style={{ minHeight: HEIGHT }}
      >
        <Mafs
          viewBox={{ x: graphic.axes.x, y: graphic.axes.y, padding: 0 }}
          preserveAspectRatio={false}
          height={HEIGHT}
          pan={false}
          zoom={false}
        >
          <Coordinates.Cartesian />
          <Curves curves={curves} graphic={graphic} />
          {drawn.map(({ row, slot }) => {
            const y = curveOf(row, {});
            return y ? (
              <Plot.OfX
                key={`d${slot}`}
                y={y}
                color={`var(--graphic-d${slot % COLORS})`}
                weight={3}
              />
            ) : null;
          })}
          <Points points={graphic.points} />
        </Mafs>
      </div>
      {graphic.parameters.length > 0 && (
        <Sliders
          parameters={graphic.parameters}
          values={values}
          onChange={(name, value) =>
            setValues((old) => ({ ...old, [name]: value }))
          }
        />
      )}
      <figcaption className="graphic__caption">{title}</figcaption>
    </figure>
  );
}
