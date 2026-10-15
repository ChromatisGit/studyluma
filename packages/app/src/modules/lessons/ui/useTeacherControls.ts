import { useCallback, useRef, useState } from "react";
import type { useLessonSession } from "../application/useLessonSession";
import type { InkTool } from "./InkLayer";
import { usePenButtons } from "./usePenButtons";
import { useTeacherKeys, type TeacherKey } from "./useTeacherKeys";

type Dispatch = ReturnType<typeof useLessonSession>["dispatch"];

/** The barrel button steps through the pens and ends on the laser. */
const PEN_CYCLE: InkTool[] = ["graphit", "violett", "signal", "laser"];

/** Tool, overview and menu state, and what each key and pen button does. */
export function useTeacherControls(
  dispatch: Dispatch,
  onStep: (by: 1 | -1) => void,
) {
  const [tool, setTool] = useState<InkTool>("cursor");
  const [overview, setOverview] = useState(false);
  const [menu, setMenu] = useState(false);
  // What `C` returns to, and what the eraser end hands back when lifted.
  const lastInk = useRef<InkTool>("graphit");
  const beforeEraser = useRef<InkTool | null>(null);

  const pick = useCallback((next: InkTool) => {
    if (next !== "cursor" && next !== "eraser") {
      lastInk.current = next;
    }
    setTool(next);
  }, []);

  const onKey = useCallback(
    (key: TeacherKey) => {
      if (key === "escape") {
        setOverview(false);
        setMenu(false);
      } else if (key === "next" || key === "previous") {
        onStep(key === "next" ? 1 : -1);
      } else if (key === "hide") {
        dispatch({ type: "toggleHidden" });
      } else if (key === "freeze") {
        dispatch({ type: "toggleFreeze" });
      } else if (key === "overview") {
        setOverview((open) => !open);
      } else if (key === "undo") {
        dispatch({ type: "undo" });
      } else if (key === "cursor") {
        setTool((current) => {
          if (current !== "cursor" && current !== "eraser") {
            lastInk.current = current;
          }
          return current === "cursor" ? lastInk.current : "cursor";
        });
      } else {
        dispatch({ type: "addBlank" });
        setTool((current) =>
          current === "graphit" || current === "violett" || current === "signal"
            ? current
            : "graphit",
        );
      }
    },
    [dispatch, onStep],
  );
  useTeacherKeys(onKey);

  usePenButtons({
    onBarrel: () =>
      setTool((current) => {
        const at = PEN_CYCLE.indexOf(current);
        const next = PEN_CYCLE[(at + 1) % PEN_CYCLE.length] ?? "graphit";
        lastInk.current = next;
        return next;
      }),
    onEraser: (down) => {
      if (down) {
        setTool((current) => {
          if (current !== "eraser") {
            beforeEraser.current = current;
          }
          return "eraser";
        });
      } else if (beforeEraser.current) {
        const back = beforeEraser.current;
        beforeEraser.current = null;
        setTool(back);
      }
    },
  });

  return { tool, setTool: pick, overview, setOverview, menu, setMenu, onKey };
}
