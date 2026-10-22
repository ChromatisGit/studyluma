import type {
  ButtonProps,
  FrameProps,
  PlaneProps,
  ViewKit,
} from "@studyluma/component-api/view";
import { Coordinates, Mafs, Plot } from "mafs";
import "mafs/core.css";
import { evaluate, tryParse } from "../domain/evaluate";
import { fitPlot, startValues } from "../domain/graphicView";
import { gridStep } from "../domain/piMultiples";
import { PiLabels, Points, SliderRow } from "./Graphic";
import { useBoxSize } from "./useBoxSize";

const COLORS = 4;
/** The height of a plane in text, as a Grafik's. */
const HEIGHT = 340;

/** The coordinate system with the curves; the size is fixed by the caller. */
function PlaneDrawing({
  axes,
  curves,
  points = [],
  y,
  height,
}: Omit<PlaneProps, "label" | "fill"> & {
  y: [number, number];
  height: number;
}) {
  return (
    <Mafs
      viewBox={{ x: axes.x, y, padding: 0 }}
      preserveAspectRatio={false}
      height={height}
      pan={false}
      zoom={false}
    >
      {axes.xGrid ? (
        <>
          <Coordinates.Cartesian
            xAxis={{ lines: gridStep(axes.xGrid), labels: false }}
          />
          <PiLabels grid={axes.xGrid} />
        </>
      ) : (
        <Coordinates.Cartesian />
      )}
      {curves.map((curve, index) => {
        const stroke = {
          color: `var(--graphic-c${(curve.color ?? index) % COLORS})`,
          weight: curve.weight ?? 2,
          opacity: curve.opacity ?? 1,
          style: curve.dashed ? ("dashed" as const) : ("solid" as const),
        };
        return "y" in curve ? (
          <Plot.OfX key={index} y={curve.y} {...stroke} />
        ) : (
          <Plot.Parametric
            key={index}
            xy={(t) => [...curve.xy(t)]}
            domain={[curve.t[0], curve.t[1]]}
            {...stroke}
          />
        );
      })}
      <Points points={points} />
    </Mafs>
  );
}

/**
 * A coordinate system for a component. In text it has the height of a
 * Grafik; with `fill` it takes the surrounding box with equal units.
 */
function Plane({ label, fill = false, ...drawing }: PlaneProps) {
  const { setElement, size } = useBoxSize();
  const fit =
    fill && size && size.width > 0 && size.height > 0
      ? fitPlot(drawing.axes, size.width, size.height)
      : undefined;
  return (
    <div
      className={`graphic__plot component-plane${fill ? " component-plane--fill" : ""}`}
      role="img"
      aria-label={label}
      ref={setElement}
      style={fill ? undefined : { minHeight: HEIGHT }}
    >
      {fill ? (
        fit && (
          <div style={{ width: fit.width, height: fit.height }}>
            <PlaneDrawing {...drawing} y={fit.y} height={fit.height} />
          </div>
        )
      ) : (
        <PlaneDrawing {...drawing} y={drawing.axes.y} height={HEIGHT} />
      )}
    </div>
  );
}

function Button({ onClick, pressed, disabled, children }: ButtonProps) {
  return (
    <button
      type="button"
      className={`component-button${pressed ? " is-pressed" : ""}`}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/**
 * Text: the drawing, the controls below. Slide: the controls at the left of
 * the drawing, as on a Grafikfolie.
 */
function Frame({ placement, controls, children }: FrameProps) {
  const side = controls && (
    <div className="component-frame__controls">{controls}</div>
  );
  return (
    <div className={`graphic component-frame component-frame--${placement}`}>
      {placement === "folie" && side}
      <div className="component-frame__main">{children}</div>
      {placement === "text" && side}
    </div>
  );
}

/**
 * What the app hands every component view to draw with. The function field
 * comes from the worksheets' math entry, which the host adds
 * (`ComponentFieldContext`).
 */
export const componentKit: Omit<ViewKit, "FunctionField"> = {
  curveOf: (row, values) => {
    const ast = tryParse(row);
    return ast ? (x: number) => evaluate(ast, { ...values, x }) : null;
  },
  startValues,
  Plane,
  Slider: SliderRow,
  Button,
  Frame,
};
