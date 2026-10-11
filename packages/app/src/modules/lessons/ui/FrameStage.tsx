import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { FRAME_HEIGHT, FRAME_WIDTH } from "../domain/lesson";

/**
 * A 16:9 surface scaled as a whole to its box, as large as possible, so
 * handwriting lands on the same spot on laptop and projector.
 */
export function FrameStage({
  children,
  className,
  surfaceRef,
}: {
  children: ReactNode;
  className?: string;
  surfaceRef?: RefObject<HTMLDivElement | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = box.current;
    if (!element) {
      return undefined;
    }
    const update = () =>
      setScale(
        Math.min(
          element.clientWidth / FRAME_WIDTH,
          element.clientHeight / FRAME_HEIGHT,
        ),
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className={["lf-stage", className].filter(Boolean).join(" ")}
      ref={box}
    >
      <div
        className="lf-stage__frame"
        ref={surfaceRef}
        style={{
          width: FRAME_WIDTH * scale,
          height: FRAME_HEIGHT * scale,
          visibility: scale ? "visible" : "hidden",
        }}
      >
        <div
          className="lf-stage__surface"
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** A fixed-scale thumbnail of a frame. */
export function FrameThumb({
  children,
  width,
}: {
  children: ReactNode;
  width: number;
}) {
  const scale = width / FRAME_WIDTH;
  return (
    <div className="lf-thumb" style={{ width, height: FRAME_HEIGHT * scale }}>
      <div
        className="lf-stage__surface"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
