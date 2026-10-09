import { useLayoutEffect, useRef, type ReactNode } from "react";
import { slideLayout, type OrderEntry } from "../domain/layout";
import type { Slide } from "../domain/deck";
import {
  InhaltView,
  MerkkarteCard,
  QuizBlock,
  SegmentsView,
  SheetCard,
} from "./FrameBlocks";
import TEXT from "./lessons.de.json";

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
  slide,
  deckTitle,
  children,
}: {
  slide: Slide;
  deckTitle: string;
  children: ReactNode;
}) {
  const kind =
    slide.kind === "slide" ? undefined : TEXT.frame.kinds[slide.kind];
  return (
    <>
      {kind && (
        <>
          <div className="lf__bar" />
          <div className="lf__tab">{kind}</div>
        </>
      )}
      {children}
      <div className="lf__foot">
        <span>{deckTitle}</span>
        <span className="lf__number">{slide.number}</span>
      </div>
    </>
  );
}

function Body({ slide, sent }: { slide: Slide; sent: boolean }) {
  const layout = slideLayout(slide);
  const fit = useFitText([slide.id]);
  if (layout === "merkkarte" && slide.merkkarte) {
    return (
      <div className="lf__center lf__center--stack" ref={fit}>
        <MerkkarteCard card={slide.merkkarte} />
        <SegmentsView segments={slide.segments} />
      </div>
    );
  }
  return (
    <div className={`lf__body lf__body--${layout}`} ref={fit}>
      <h1 className="lf__title">
        {layout === "summary"
          ? `${TEXT.frame.kinds.summary}: ${slide.title}`
          : slide.title}
      </h1>
      <div className="lf__blocks">
        {layout === "sheet" && <SheetCard slide={slide} sent={sent} />}
        {layout === "quiz" && slide.quiz && (
          <QuizBlock quiz={slide.quiz} slideId={slide.id} />
        )}
        {layout === "summary" && <InhaltView slide={slide} />}
        <SegmentsView segments={slide.segments} />
      </div>
    </div>
  );
}

export interface FrameViewProps {
  entry: OrderEntry;
  deckTitle: string;
  sent?: boolean;
  children?: ReactNode;
}

/**
 * One slide on the logical 1280 × 720 surface. The same component renders
 * the stage, the overview thumbnails and the projector.
 */
export function FrameView({
  entry,
  deckTitle,
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
  const { slide } = entry;
  return (
    <div className={`lf lf--${slideLayout(slide)}`}>
      <Chrome slide={slide} deckTitle={deckTitle}>
        <Body slide={slide} sent={sent} />
      </Chrome>
      {children}
    </div>
  );
}
