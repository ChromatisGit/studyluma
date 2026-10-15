import { useEffect, useRef } from "react";

/**
 * Pen hardware, as the browser reports it: the barrel button is a middle
 * button (`buttons & 4`) that can rise during a hover, a touch or in the
 * middle of a stroke, and the eraser end is its own pointer (`button 5`,
 * `buttons & 32`).
 */
export function usePenButtons({
  onBarrel,
  onEraser,
}: {
  onBarrel: () => void;
  onEraser: (down: boolean) => void;
}) {
  const handlers = useRef({ onBarrel, onEraser });
  useEffect(() => {
    handlers.current = { onBarrel, onEraser };
  });

  useEffect(() => {
    let barrel = false;
    let eraser = false;
    const sync = (event: PointerEvent) => {
      if (event.pointerType !== "pen") {
        return;
      }
      const barrelNow = (event.buttons & 4) !== 0;
      if (barrelNow && !barrel) {
        handlers.current.onBarrel();
      }
      barrel = barrelNow;
      const eraserNow = (event.buttons & 32) !== 0 || event.button === 5;
      if (eraserNow !== eraser && (eraserNow || event.type !== "pointermove")) {
        eraser = eraserNow;
        handlers.current.onEraser(eraserNow);
      }
    };
    const release = (event: PointerEvent) => {
      if (event.pointerType !== "pen") {
        return;
      }
      barrel = false;
      if (eraser) {
        eraser = false;
        handlers.current.onEraser(false);
      }
    };
    document.addEventListener("pointerdown", sync, true);
    document.addEventListener("pointermove", sync, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    return () => {
      document.removeEventListener("pointerdown", sync, true);
      document.removeEventListener("pointermove", sync, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", release, true);
    };
  }, []);
}
