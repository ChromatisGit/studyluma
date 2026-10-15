import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  FRAME_HEIGHT,
  FRAME_WIDTH,
  type InkColor,
  type InkStroke,
} from "../domain/lesson";
import { strokeAt } from "../domain/session";

export type InkTool = "cursor" | "laser" | InkColor | "eraser";

const path = (points: [number, number][]) =>
  points.length === 1
    ? `M${points[0]?.[0]} ${points[0]?.[1]}l0.1 0`
    : points
        .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
        .join("");

/** Handwriting on top of a frame, in the frame's own coordinates. */
export function InkStrokes({
  strokes,
  laser,
}: {
  strokes: InkStroke[];
  laser?: [number, number] | null;
}) {
  return (
    <svg
      className="lf-ink"
      viewBox={`0 0 ${FRAME_WIDTH} ${FRAME_HEIGHT}`}
      aria-hidden="true"
    >
      {strokes.map((stroke) => (
        <path
          key={stroke.id}
          d={path(stroke.points)}
          className={`lf-ink__stroke lf-ink__stroke--${stroke.color}`}
        />
      ))}
      {laser && (
        <circle className="lf-ink__laser" cx={laser[0]} cy={laser[1]} r={10} />
      )}
    </svg>
  );
}

/** Holding the pen still this long (ms) straightens the stroke into a line. */
const HOLD_MS = 500;
/** Movement (logical px) that still counts as holding still. */
const HOLD_JITTER = 4;
/** A stroke shorter than this stays a dot or a scribble. */
const HOLD_MIN_TRAVEL = 20;

const distance = (a: [number, number], b: [number, number]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

let strokeCount = 0;
const newId = () =>
  `k${Date.now().toString(36)}${(strokeCount++).toString(36)}`;

/**
 * The stroke being written. Holding the pen still turns it into a straight
 * line from its start that then follows the pen until it is lifted.
 */
function useStrokeDraft(
  frameId: string,
  onStroke: (stroke: InkStroke) => void,
) {
  const [draft, setDraft] = useState<InkStroke | null>(null);
  const live = useRef<InkStroke | null>(null);
  const hold = useRef<{
    anchor: [number, number];
    timer: number;
    straight: boolean;
  } | null>(null);
  useEffect(() => () => window.clearTimeout(hold.current?.timer), []);

  const show = (next: InkStroke | null) => {
    live.current = next;
    setDraft(next);
  };
  const arm = (anchor: [number, number], straight: boolean) => {
    window.clearTimeout(hold.current?.timer);
    hold.current = {
      anchor,
      straight,
      timer: window.setTimeout(() => {
        const stroke = live.current;
        const first = stroke?.points[0];
        const last = stroke?.points.at(-1);
        if (
          hold.current &&
          stroke &&
          first &&
          last &&
          distance(first, last) >= HOLD_MIN_TRAVEL
        ) {
          hold.current.straight = true;
          show({ ...stroke, points: [first, last] });
        }
      }, HOLD_MS),
    };
  };

  return {
    draft,
    begin: (color: InkColor, start: [number, number]) => {
      show({ id: newId(), frameId, color, points: [start] });
      arm(start, false);
    },
    move: (point: [number, number]) => {
      const stroke = live.current;
      const first = stroke?.points[0];
      if (!stroke || !first || !hold.current) {
        return;
      }
      const { anchor, straight } = hold.current;
      show({
        ...stroke,
        points: straight ? [first, point] : [...stroke.points, point],
      });
      if (!straight && distance(point, anchor) > HOLD_JITTER) {
        arm(point, false);
      }
    },
    finish: () => {
      window.clearTimeout(hold.current?.timer);
      hold.current = null;
      if (live.current) {
        onStroke(live.current);
        show(null);
      }
    },
  };
}

/**
 * Captures the pointer for the active tool: pens draw vector strokes, the
 * eraser removes whole strokes, the laser only reports where it is.
 */
export function InkInput({
  tool,
  frameId,
  strokes,
  onStroke,
  onErase,
  onLaser,
}: {
  tool: InkTool;
  frameId: string;
  strokes: InkStroke[];
  onStroke: (stroke: InkStroke) => void;
  onErase: (strokeId: string) => void;
  onLaser: (point: [number, number] | null) => void;
}) {
  const { draft, begin, move, finish } = useStrokeDraft(frameId, onStroke);
  const surface = useRef<HTMLDivElement>(null);
  if (tool === "cursor") {
    return null;
  }
  const toLogical = (event: PointerEvent): [number, number] => {
    const box = surface.current?.getBoundingClientRect();
    if (!box) {
      return [0, 0];
    }
    return [
      ((event.clientX - box.left) / box.width) * FRAME_WIDTH,
      ((event.clientY - box.top) / box.height) * FRAME_HEIGHT,
    ];
  };
  const erase = (event: PointerEvent) => {
    const [x, y] = toLogical(event);
    const hit = strokeAt(strokes, x, y);
    if (hit) {
      onErase(hit.id);
    }
  };
  return (
    <div
      ref={surface}
      className={`lf-input lf-input--${tool}`}
      onPointerDown={(event) => {
        // The barrel button (middle) only switches tools; it never draws.
        if (tool === "laser" || (event.button !== 0 && event.button !== 5)) {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        if (tool === "eraser") {
          erase(event);
          return;
        }
        begin(tool, toLogical(event));
      }}
      onPointerMove={(event) => {
        if (tool === "laser") {
          onLaser(toLogical(event));
        } else if (tool === "eraser" && event.buttons) {
          erase(event);
        } else if (draft) {
          move(toLogical(event));
        }
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={() => tool === "laser" && onLaser(null)}
    >
      {draft && <InkStrokes strokes={[draft]} />}
    </div>
  );
}
