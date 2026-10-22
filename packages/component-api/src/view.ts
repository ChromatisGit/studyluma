/**
 * The browser side of a StudyLuma component: the types its `view.tsx`
 * follows. Types only; the app hands the view everything it draws with
 * (`kit`), so a component needs no plotting library of its own.
 */
import type { ComponentType, ReactNode } from "react";
import type { Graphic, MathRow } from "@studyluma/catalog-contract";
import type { Placement } from "./index";

export type { Graphic, MathRow, Placement };

/**
 * What the app passes to a view. The state belongs to the host: on a
 * Komponentenfolie it is mirrored to the projector and frozen with it, in
 * text it stays on the device. Whatever the projector should see goes into
 * `state`, never into a local `useState`.
 */
export type ViewProps<Props, State> = Readonly<{
  /** What `compile` returned for this use. */
  props: Props;
  state: State;
  setState(next: State | ((current: State) => State)): void;
  placement: Placement;
  /** False on the projector and in previews: show the state, change nothing. */
  interactive: boolean;
  /** The text for screen readers (`description`). */
  title: string;
  kit: ViewKit;
}>;

/** What a `view.tsx` exports. */
export type ComponentViewModule<Props, State> = {
  default: ComponentType<ViewProps<Props, State>>;
  /** The state before anybody touched the component. Plain JSON. */
  initialState(props: Props): State;
};

/** How a curve is drawn: color 0–3 of the house palette, line width, dashes. */
export type CurveStyle = Readonly<{
  color?: number;
  weight?: number;
  dashed?: boolean;
  opacity?: number;
}>;

/** A function of x, or a parametric curve over `t`. */
export type PlaneCurve = CurveStyle &
  (
    | Readonly<{ y: (x: number) => number }>
    | Readonly<{
        xy: (t: number) => readonly [number, number];
        t: readonly [number, number];
      }>
  );

export type PlaneProps = Readonly<{
  axes: Graphic["axes"];
  curves: readonly PlaneCurve[];
  points?: Graphic["points"];
  /** What a screen reader says for the drawing. */
  label: string;
  /** Fill the surrounding box with equal units on both axes (a slide). */
  fill?: boolean;
}>;

export type SliderProps = Readonly<{
  parameter: Graphic["parameters"][number];
  value: number;
  onChange(value: number): void;
  /** Shows the value without taking input. */
  fixed?: boolean;
}>;

export type ButtonProps = Readonly<{
  onClick(): void;
  pressed?: boolean;
  disabled?: boolean;
  children: ReactNode;
}>;

/** A field for a function of x, written with the keypad like an answer. */
export type FunctionFieldProps = Readonly<{
  row: MathRow;
  onChange(row: MathRow): void;
  /** What a screen reader says for the field. */
  label: string;
  /** Shows the function without taking input (the projector). */
  fixed?: boolean;
}>;

export type FrameProps = Readonly<{
  placement: Placement;
  /** Buttons and sliders: below the drawing in text, beside it on a slide. */
  controls?: ReactNode;
  children: ReactNode;
}>;

/** The app's means of drawing, the same as its Grafiken use. */
export type ViewKit = Readonly<{
  /** The function of a compiled term in x and the parameters; null when it cannot be read. */
  curveOf(
    row: MathRow,
    values: Readonly<Record<string, number>>,
  ): ((x: number) => number) | null;
  /** The start values of a Grafik's sliders, by name. */
  startValues(graphic: Graphic): Record<string, number>;
  /** A coordinate system with the axes of a Grafik, its curves and points. */
  Plane: ComponentType<PlaneProps>;
  Slider: ComponentType<SliderProps>;
  Button: ComponentType<ButtonProps>;
  /** `y = ` and a math field; `curveOf` draws what it holds. */
  FunctionField: ComponentType<FunctionFieldProps>;
  /** The house layout of a component in text and on a slide. */
  Frame: ComponentType<FrameProps>;
}>;
