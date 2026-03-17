import type { TypedSlide } from "@schema/slideTypes";
import { SectionSlideView } from "./slides/SectionSlideView";
import { HookSlideView } from "./slides/HookSlideView";
import { ConceptSlideView } from "./slides/ConceptSlideView";
import { CompareSlideView } from "./slides/CompareSlideView";
import { ExampleSlideView } from "./slides/ExampleSlideView";
import { PromptSlideView } from "./slides/PromptSlideView";
import { TaskSlideView } from "./slides/TaskSlideView";
import { RecapSlideView } from "./slides/RecapSlideView";
import { QuizSlideView } from "./slides/QuizSlideView";
import styles from "./SlideRenderer.module.css";

type SlideRendererProps = {
  slide: TypedSlide;
  projector?: boolean;
  revealStep?: number;
};

function renderSlideContent(slide: TypedSlide, projector: boolean, revealStep: number) {
  switch (slide.slideType) {
    case "sectionSlide":
      return <SectionSlideView slide={slide} />;
    case "hookSlide":
      return <HookSlideView slide={slide} revealStep={revealStep} projector={projector} />;
    case "conceptSlide":
      return <ConceptSlideView slide={slide} revealStep={revealStep} projector={projector} />;
    case "compareSlide":
      return <CompareSlideView slide={slide} revealStep={revealStep} />;
    case "exampleSlide":
      return <ExampleSlideView slide={slide} revealStep={revealStep} projector={projector} />;
    case "promptSlide":
      return <PromptSlideView slide={slide} revealStep={revealStep} projector={projector} />;
    case "taskSlide":
      return <TaskSlideView slide={slide} revealStep={revealStep} projector={projector} />;
    case "recapSlide":
      return <RecapSlideView slide={slide} />;
    case "quizSlide":
      return <QuizSlideView slide={slide} projector={projector} />;
  }
}

export function SlideRenderer({ slide, projector = false, revealStep = 0 }: SlideRendererProps) {
  const isSection = slide.slideType === "sectionSlide";
  const cardClass = [
    styles.card,
    projector ? styles.cardFull : "",
    isSection ? styles.cardSection : "",
  ].filter(Boolean).join(" ");

  const card = (
    <div className={cardClass}>
      {renderSlideContent(slide, projector, revealStep)}
    </div>
  );

  if (projector) {
    return <div className={styles.slideFrame}>{card}</div>;
  }
  return <div className={styles.slidePreview}>{card}</div>;
}
