import { useRef, useState, type PointerEvent } from "react";
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

let strokeCount = 0;
const newId = () =>
  `k${Date.now().toString(36)}${(strokeCount++).toString(36)}`;

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
  const [draft, setDraft] = useState<InkStroke | null>(null);
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
        if (tool === "laser") {
          return;
        }
        event.currentTarget.setPointerCapture(event.pointerId);
        if (tool === "eraser") {
          erase(event);
          return;
        }
        setDraft({
          id: newId(),
          frameId,
          color: tool,
          points: [toLogical(event)],
        });
      }}
      onPointerMove={(event) => {
        if (tool === "laser") {
          onLaser(toLogical(event));
        } else if (tool === "eraser" && event.buttons) {
          erase(event);
        } else if (draft) {
          setDraft({ ...draft, points: [...draft.points, toLogical(event)] });
        }
      }}
      onPointerUp={() => {
        if (draft) {
          onStroke(draft);
          setDraft(null);
        }
      }}
      onPointerLeave={() => tool === "laser" && onLaser(null)}
    >
      {draft && <InkStrokes strokes={[draft]} />}
    </div>
  );
}
