import type { ViewProps } from "@studyluma/component-api/view";
import type { ProbeProps } from "./types";

export type ProbeState = { x: number };

export const initialState = (props: ProbeProps): ProbeState => ({
  x: props.start,
});

/** A point on the graph; the buttons move it by one, the state carries it to the projector. */
export default function Probe({
  props,
  state,
  setState,
  placement,
  interactive,
  title,
  kit,
}: ViewProps<ProbeProps, ProbeState>) {
  const graph = props.graphic.graphs[0];
  const f = graph && kit.curveOf(graph.row, kit.startValues(props.graphic));
  const y = f?.(state.x);
  const move = (by: number) => setState((current) => ({ x: current.x + by }));
  return (
    <kit.Frame
      placement={placement}
      controls={
        <>
          <kit.Button disabled={!interactive} onClick={() => move(-1)}>
            x − 1
          </kit.Button>
          <kit.Button disabled={!interactive} onClick={() => move(1)}>
            x + 1
          </kit.Button>
          <kit.Button
            disabled={!interactive}
            onClick={() => setState(initialState(props))}
          >
            Zurück
          </kit.Button>
          <span>x = {state.x}</span>
        </>
      }
    >
      <kit.Plane
        axes={props.graphic.axes}
        curves={f ? [{ y: f }] : []}
        points={
          y !== undefined && Number.isFinite(y)
            ? [{ position: [state.x, y], name: "P" }]
            : []
        }
        label={title}
        fill={placement === "folie"}
      />
    </kit.Frame>
  );
}
