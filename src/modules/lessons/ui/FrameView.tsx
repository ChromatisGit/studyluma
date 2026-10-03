import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  bleedsImage,
  columnWidths,
  frameLayout,
  hasWritingSpace,
  type OrderEntry,
} from "../domain/layout";
import type { LessonFrame } from "../domain/lesson";
import { FrameBlockView, WritingZone } from "./FrameBlocks";

/**
 * Content shrinks until it fits, down to a minimum size that stays
 * readable from the back of the room.
 */
function useFitText(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    let scale = 1;
    element.style.setProperty("--lf-scale", "1");
    while (scale > 0.7 && element.scrollHeight > element.clientHeight + 1) {
      scale -= 0.05;
      element.style.setProperty("--lf-scale", scale.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

function Chrome({
  frame,
  lessonTitle,
  children,
}: {
  frame: LessonFrame;
  lessonTitle: string;
  children: ReactNode;
}) {
  return (
    <>
      {frame.marking && (
        <>
          <div className="lf__bar" />
          <div className="lf__tab">{frame.marking}</div>
        </>
      )}
      {children}
      <div className="lf__foot">
        <span>{lessonTitle}</span>
        <span className="lf__number">{frame.number}</span>
      </div>
    </>
  );
}

function Columns({ frame, sent }: { frame: LessonFrame; sent: boolean }) {
  const columns = frame.columns ?? [];
  const bleed = bleedsImage(frame);
  const fit = useFitText([frame.id]);
  if (bleed) {
    const [image, ...rest] = columns;
    return (
      <div
        className="lf__bleed"
        style={{ gridTemplateColumns: columnWidths(columns) } as CSSProperties}
      >
        <div className="lf__bleed-image">
          {image?.map((block, i) => (
            <FrameBlockView key={i} block={block} sent={sent} />
          ))}
        </div>
        <div className="lf__bleed-text" ref={fit}>
          <h1 className="lf__title lf__title--small">{frame.title}</h1>
          {rest.flat().map((block, i) => (
            <FrameBlockView key={i} block={block} sent={sent} />
          ))}
          <WritingZone />
        </div>
      </div>
    );
  }
  return (
    <div className="lf__body" ref={fit}>
      <h1 className="lf__title">{frame.title}</h1>
      <div
        className="lf__columns"
        style={{ gridTemplateColumns: columnWidths(columns) }}
      >
        {columns.map((column, c) => (
          <div key={c} className="lf__column">
            {column.map((block, i) => (
              <FrameBlockView key={i} block={block} sent={sent} />
            ))}
            {!column.some((block) => block.type === "image") && <WritingZone />}
          </div>
        ))}
      </div>
    </div>
  );
}

function Body({ frame, sent }: { frame: LessonFrame; sent: boolean }) {
  const layout = frameLayout(frame);
  const blocks = frame.blocks ?? [];
  const fit = useFitText([frame.id]);
  if (layout === "spalten" && frame.columns) {
    return <Columns frame={frame} sent={sent} />;
  }
  if (layout === "merkkarte") {
    return (
      <div className="lf__center">
        {blocks.map((block, i) => (
          <FrameBlockView key={i} block={block} sent={sent} />
        ))}
      </div>
    );
  }
  return (
    <div className={`lf__body lf__body--${layout}`} ref={fit}>
      <h1 className="lf__title">{frame.title}</h1>
      <div className="lf__blocks">
        {blocks.map((block, i) => (
          <FrameBlockView key={i} block={block} sent={sent} />
        ))}
        {hasWritingSpace(frame) && <WritingZone />}
      </div>
    </div>
  );
}

export interface FrameViewProps {
  entry: OrderEntry;
  lessonTitle: string;
  sent?: boolean;
  children?: ReactNode;
}

/**
 * One frame on the logical 1280 × 720 surface. The same component renders
 * the stage, the overview thumbnails and the projector.
 */
export function FrameView({
  entry,
  lessonTitle,
  sent = false,
  children,
}: FrameViewProps) {
  if (entry.kind === "blank") {
    return (
      <div className="lf lf--flaeche">
        <span className="lf-zone__label lf__blank-label">{entry.label}</span>
        {children}
      </div>
    );
  }
  const { frame } = entry;
  const layout = frameLayout(frame);
  return (
    <div
      className={`lf lf--${layout}`}
      data-family={frame.family}
      data-bleed={bleedsImage(frame) ? "" : undefined}
    >
      <Chrome frame={frame} lessonTitle={lessonTitle}>
        {layout === "flaeche" ? (
          <WritingZone />
        ) : (
          <Body frame={frame} sent={sent} />
        )}
      </Chrome>
      {children}
    </div>
  );
}
