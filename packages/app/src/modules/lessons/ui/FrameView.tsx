import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  isWritingSlide,
  slideLayout,
  slideTab,
  type OrderEntry,
} from "../domain/layout";
import type { Slide } from "../domain/deck";
import {
  CardsContext,
  InhaltView,
  MerkkarteCard,
  QuizBlock,
  SegmentsView,
  SheetCard,
} from "./FrameBlocks";
import { BlankTask } from "./BlankTask";
import { useQuizWaiting } from "./FrameQuiz";
import { GraphicSlideBody, isGraphicSlide } from "./GraphicSlide";
import TEXT from "./lessons.de.json";

/** How far text may grow on a slide that is only to be read, and how far it shrinks to fit. */
const FIT = { grow: 1.3, shrink: 0.7, step: 0.05 };

/**
 * Text fills the slide: a slide to read grows until it is full, a slide
 * with `::platz` keeps its size, and too much content shrinks down to a
 * size that stays readable from the back of the room.
 */
function useFitText(deps: unknown[], grow: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const overflows = () => element.scrollHeight > element.clientHeight + 1;
    let scale = grow ? FIT.grow : 1;
    element.style.setProperty("--lf-scale", scale.toFixed(2));
    while (scale > FIT.shrink && overflows()) {
      scale -= FIT.step;
      element.style.setProperty("--lf-scale", scale.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Color bar and tab: the tab says what happens here, its color which kind of slide it is. */
function Tab({ slide }: { slide: Slide }) {
  const tab = slideTab(slide);
  return (
    <>
      <div className="lf__bar" />
      <div className="lf__tab">
        <span className="lf__tab-label">{tab.label || TEXT.frame.slide}</span>
        <span className="lf__tab-number">{slide.number}</span>
      </div>
    </>
  );
}

function Body({ slide, sent }: { slide: Slide; sent: boolean }) {
  const layout = slideLayout(slide);
  const writing = layout === "slide" && isWritingSlide(slide);
  const graphic = isGraphicSlide(slide);
  const fit = useFitText(
    [slide.id],
    (layout === "slide" && !writing && !graphic) || layout === "sheet",
  );
  const card = slide.kind === "merkkarte" ? slide.merkkarte : undefined;
  const waiting = useQuizWaiting(slide.id) && layout === "quiz";
  return (
    <div
      className={`lf__body lf__body--${layout}${graphic ? " lf__body--graphic" : ""}${waiting ? " is-waiting" : ""}`}
      ref={fit}
    >
      {!card && !waiting && (
        <h1 className="lf__title">
          {layout === "summary"
            ? `${TEXT.frame.kinds.summary}: ${slide.title}`
            : slide.title}
        </h1>
      )}
      {isGraphicSlide(slide) ? (
        <GraphicSlideBody slide={slide} />
      ) : (
        <div className="lf__blocks">
          {card && <MerkkarteCard card={card} />}
          <SegmentsView segments={slide.segments} />
          {layout === "sheet" && <SheetCard slide={slide} sent={sent} />}
          {layout === "quiz" && slide.quiz && (
            <QuizBlock slideId={slide.id} title={slide.title} />
          )}
          {layout === "summary" && <InhaltView slide={slide} />}
        </div>
      )}
    </div>
  );
}

export interface FrameViewProps {
  entry: OrderEntry;
  sent?: boolean;
  children?: ReactNode;
}

/**
 * One slide on the logical 1280 × 720 surface. The same component renders
 * the stage, the overview thumbnails and the projector.
 */
export function FrameView({ entry, sent = false, children }: FrameViewProps) {
  if (entry.kind === "blank") {
    return (
      <div className="lf lf--flaeche">
        <span className="lf-zone__label lf__blank-label">{entry.label}</span>
        <BlankTask blank={entry.blank} parent={entry.parent} />
        {children}
      </div>
    );
  }
  const { slide } = entry;
  const layout = slideLayout(slide);
  const tone = slideTab(slide).tone;
  const writing = layout === "slide" && isWritingSlide(slide);
  return (
    <CardsContext.Provider value={slide.cards}>
      <div
        className={`lf lf--${layout} lf--tone-${tone}${writing ? " lf--writing" : ""}`}
      >
        <Tab slide={slide} />
        <Body slide={slide} sent={sent} />
        {children}
      </div>
    </CardsContext.Provider>
  );
}
