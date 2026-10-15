import { useCallback, useContext, useEffect, useRef } from "react";
import { ScrollSyncContext } from "./FrameBlocks";
import TEXT from "./lessons.de.json";

/**
 * The real worksheet page in a frame, as the class sees it. On the
 * teacher's stage it can be used (answers, hints, tasks to a blank
 * surface); on the projector it is a mirror that follows the teacher's
 * scrolling. Answers and the open section reach the projector through the
 * saved chapter state of the shared browser.
 */
export function SheetEmbed({
  src,
  slideId,
  interactive,
}: {
  src: string;
  slideId: string;
  interactive: boolean;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const { report, follow } = useContext(ScrollSyncContext);
  const ratio = follow?.slideId === slideId ? follow.ratio : null;

  const scroller = () => frame.current?.contentDocument?.scrollingElement;

  const apply = useCallback(() => {
    const element = scroller();
    if (element && ratio !== null) {
      element.scrollTop = ratio * (element.scrollHeight - element.clientHeight);
    }
  }, [ratio]);
  useEffect(apply, [apply]);

  const onLoad = () => {
    apply();
    if (!interactive || !report) {
      return;
    }
    frame.current?.contentWindow?.addEventListener("scroll", () => {
      const element = scroller();
      if (element) {
        const room = element.scrollHeight - element.clientHeight;
        report(slideId, room > 0 ? element.scrollTop / room : 0);
      }
    });
  };

  return (
    <iframe
      ref={frame}
      className="lf-sheetframe"
      title={TEXT.teacher.sheetOnProjector}
      src={src}
      onLoad={onLoad}
      style={interactive ? undefined : { pointerEvents: "none" }}
    />
  );
}
