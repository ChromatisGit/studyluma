"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TypedSlideDeck } from "@schema/slideTypes";
import type { MacroStateAdapter } from "@macros/state/MacroStateAdapter";
import type { AdminStreamEvent, AdminSnapshot } from "@schema/streamTypes";
import type { QuizResultsDTO } from "@schema/quizTypes";
import { MacroStateProvider } from "@macros/state/MacroStateContext";
import { broadcastSlideStateAction } from "@actions/slideActions";
import { useSlideState } from "./hooks/useSlideState";
import { useSlideStream } from "./hooks/useSlideStream";
import { useSlideKeyboard } from "./hooks/useSlideKeyboard";
import { SlideRenderer } from "./components/SlideRenderer";
import { SlideControls } from "./components/SlideControls";
import { PresenterNotes } from "./components/PresenterNotes";
import { PresentationTimer } from "./components/PresentationTimer";
import { SlideOverviewGrid } from "./components/SlideOverviewGrid";
import styles from "./SlidePresenter.module.css";

type SlidePresenterProps = {
  deck: TypedSlideDeck;
  courseId: string;
  projectorPath: string;
};

export function SlidePresenter({ deck, courseId, projectorPath }: SlidePresenterProps) {
  const slides = deck.content;
  const { state, next, prev, goTo, first, last, toggleBlackout } =
    useSlideState({ slides });

  const [showGrid, setShowGrid] = useState(false);
  const projectorWindowRef = useRef<Window | null>(null);

  const macroStateRef = useRef<Record<string, string>>({});
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  const broadcast = useCallback(() => {
    broadcastSlideStateAction(courseId, {
      slideIndex: stateRef.current.slideIndex,
      blackout: stateRef.current.blackout,
      macroState: macroStateRef.current,
      revealStep: stateRef.current.revealStep,
    }).catch(() => {});
  }, [courseId]);

  useEffect(() => {
    broadcast();
  }, [state.slideIndex, state.blackout, state.revealStep, broadcast]);

  const macroAdapter = useMemo<MacroStateAdapter>(
    () => ({
      read: (key) => macroStateRef.current[key] ?? null,
      write: (key, value) => {
        macroStateRef.current = { ...macroStateRef.current, [key]: value };
        broadcast();
      },
      isReadOnly: false,
    }),
    [broadcast],
  );

  const [, setQuizResults] = useState<QuizResultsDTO | null>(null);
  const onEvent = useCallback((event: AdminStreamEvent) => {
    switch (event.type) {
      case "INIT": {
        const init = event as AdminSnapshot;
        setQuizResults(init.quiz);
        break;
      }
      case "QUIZ_STATE":
        setQuizResults(event.quiz as QuizResultsDTO | null);
        break;
    }
  }, []);

  useSlideStream({ courseId, onEvent });

  const openProjector = useCallback(() => {
    const w = window.open(projectorPath, "studynode-projector", "popup");
    if (w) projectorWindowRef.current = w;
  }, [projectorPath]);

  const handleBlackout = useCallback(() => {
    toggleBlackout();
  }, [toggleBlackout]);

  useSlideKeyboard({
    onNext: next,
    onPrev: prev,
    onFirst: first,
    onLast: last,
    onBlackout: handleBlackout,
    onFullscreen: () => {},
    onGrid: () => setShowGrid((v) => !v),
    onLaser: () => {},
  });

  const currentSlide = slides[state.slideIndex];
  const nextSlide = slides[state.slideIndex + 1];

  return (
    <MacroStateProvider adapter={macroAdapter}>
      <div className={styles.presenter}>
        <header className={styles.header}>
          <h1 className={styles.title}>{deck.title}</h1>
          <PresentationTimer />
          <SlideControls
            slideIndex={state.slideIndex}
            totalSlides={slides.length}
            blackout={state.blackout}
            onNext={next}
            onPrev={prev}
            onBlackout={handleBlackout}
            onFullscreen={() => {}}
            onOpenProjector={openProjector}
          />
        </header>

        <div className={styles.body}>
          <main className={styles.slidePreview}>
            {currentSlide && <SlideRenderer key={state.slideIndex} slide={currentSlide} revealStep={state.revealStep} />}
          </main>

          <aside className={styles.sidebar}>
            {currentSlide && <PresenterNotes notes={currentSlide.presenterNotes} />}

            {nextSlide && (
              <div className={styles.nextPreview}>
                <h3 className={styles.nextLabel}>Nächste Folie</h3>
                <p className={styles.nextTitle}>{nextSlide.header}</p>
              </div>
            )}

            <div className={styles.thumbnails}>
              {slides.map((slide, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.thumb} ${i === state.slideIndex ? styles.thumbActive : ""}`}
                  onClick={() => goTo(i)}
                >
                  <span className={styles.thumbNumber}>{i + 1}</span>
                  <span className={styles.thumbTitle}>{slide.header}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>

        {showGrid && (
          <SlideOverviewGrid
            slides={slides}
            currentIndex={state.slideIndex}
            onSelect={goTo}
            onClose={() => setShowGrid(false)}
          />
        )}
      </div>
    </MacroStateProvider>
  );
}
