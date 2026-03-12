"use client";

import { useState, useCallback, useMemo } from "react";
import type { SlideDeck } from "@schema/slideTypes";
import type { AdminStreamEvent, LiveSlideState, AdminSnapshot } from "@schema/streamTypes";
import type { MacroRenderContext } from "@macros/componentTypes";
import type { QuizResultsDTO } from "@schema/quizTypes";
import { MacroStateProvider } from "@macros/state/MacroStateContext";
import { QuizProjectorOverlay } from "@features/quiz/QuizProjectorOverlay";
import { useSlideStream } from "./hooks/useSlideStream";
import { SlideRenderer } from "./components/SlideRenderer";
import styles from "./SlideProjector.module.css";

type SlideProjectorProps = {
  deck: SlideDeck;
  courseId: string;
};

function createReadOnlyAdapter(macroState: Record<string, string>) {
  return {
    read: (key: string) => macroState[key] ?? null,
    write: () => { /* projector is read-only */ },
    isReadOnly: true as const,
  };
}

export function SlideProjector({ deck, courseId }: SlideProjectorProps) {
  const [slideState, setSlideState] = useState<LiveSlideState>({
    slideIndex: 0,
    blackout: false,
    macroState: {},
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
        });
        break;
      case "QUIZ_STATE":
        setQuizState(event.quiz as QuizResultsDTO | null);
        break;
      // PRESENCE is admin-only; projector can ignore it
    }
  }, []);

  useSlideStream({ courseId, onEvent });

  const currentSlide = deck.slides[slideState.slideIndex];
  const slideContext: MacroRenderContext = { readOnly: true, projector: true };

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
            <p>Verbinde…</p>
          </div>
        )}
        {currentSlide && (
          <SlideRenderer
            header={currentSlide.header}
            content={currentSlide.content}
            context={slideContext}
            slideIndex={slideState.slideIndex}
          />
        )}
        <QuizProjectorOverlay quizState={quizState} />
      </div>
    </MacroStateProvider>
  );
}
