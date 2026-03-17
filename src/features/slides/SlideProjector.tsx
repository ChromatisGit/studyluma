"use client";

import { useState, useCallback, useMemo } from "react";
import type { TypedSlideDeck } from "@schema/slideTypes";
import type { AdminStreamEvent, LiveSlideState, AdminSnapshot } from "@schema/streamTypes";
import type { QuizResultsDTO } from "@schema/quizTypes";
import { MacroStateProvider } from "@macros/state/MacroStateContext";
import { QuizProjectorOverlay } from "@features/quiz/QuizProjectorOverlay";
import { SlideRenderer } from "./components/SlideRenderer";
import { useSlideStream } from "./hooks/useSlideStream";
import styles from "./SlideProjector.module.css";

type SlideProjectorProps = {
  deck: TypedSlideDeck;
  courseId: string;
};

function createReadOnlyAdapter(macroState: Record<string, string>) {
  return {
    read: (key: string) => macroState[key] ?? null,
    write: () => {},
    isReadOnly: true as const,
  };
}

export function SlideProjector({ deck, courseId }: SlideProjectorProps) {
  const slides = deck.content;
  const [slideState, setSlideState] = useState<LiveSlideState>({
    slideIndex: 0,
    blackout: false,
    macroState: {},
    revealStep: 0,
  });
  const [quizState, setQuizState] = useState<QuizResultsDTO | null>(null);
  const [synced, setSynced] = useState(false);

  const onEvent = useCallback((event: AdminStreamEvent) => {
    switch (event.type) {
      case "INIT": {
        const init = event as AdminSnapshot;
        setSlideState({
          slideIndex: init.slideIndex,
          blackout: init.blackout,
          macroState: init.macroState,
          revealStep: init.revealStep ?? 0,
        });
        setQuizState(init.quiz);
        setSynced(true);
        break;
      }
      case "SLIDE_STATE":
        setSlideState({
          slideIndex: event.slideIndex,
          blackout: event.blackout,
          macroState: event.macroState,
          revealStep: event.revealStep ?? 0,
        });
        break;
      case "QUIZ_STATE":
        setQuizState(event.quiz as QuizResultsDTO | null);
        break;
    }
  }, []);

  useSlideStream({ courseId, onEvent });

  const currentSlide = slides[slideState.slideIndex];
  const macroAdapter = useMemo(
    () => createReadOnlyAdapter(slideState.macroState),
    [slideState.macroState],
  );

  return (
    <MacroStateProvider adapter={macroAdapter}>
      <div className={styles.projector}>
        {slideState.blackout && <div className={styles.blackout} />}
        {!synced && (
          <div className={styles.syncing}>
            <p>Verbinde...</p>
          </div>
        )}
        {currentSlide && <SlideRenderer key={slideState.slideIndex} slide={currentSlide} projector revealStep={slideState.revealStep} />}
        <QuizProjectorOverlay quizState={quizState} />
      </div>
    </MacroStateProvider>
  );
}
