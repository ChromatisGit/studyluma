"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlideDeck } from "@schema/slideTypes";
import type { MacroRenderContext } from "@macros/componentTypes";
import type { MacroStateAdapter } from "@macros/state/MacroStateAdapter";
import type { QuizMacro } from "@macros/quiz/types";
import type { AdminStreamEvent, AdminSnapshot } from "@schema/streamTypes";
import type { QuizResultsDTO } from "@schema/quizTypes";
import { MacroStateProvider } from "@macros/state/MacroStateContext";
import { QuizPresenterPanel } from "@features/quiz/QuizPresenterPanel";
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
  deck: SlideDeck;
  courseId: string;
  projectorPath: string;
};

function findQuizMacros(content: SlideDeck["slides"][number]["content"]): QuizMacro[] {
  const result: QuizMacro[] = [];
  for (const node of content) {
    if ("type" in node && node.type === "quiz") {
      result.push(node as QuizMacro);
    } else if ("type" in node && node.type === "group") {
      const group = node as { type: "group"; macros: { type: string }[] };
      for (const macro of group.macros) {
        if (macro.type === "quiz") result.push(macro as QuizMacro);
      }
    }
  }
  return result;
}

export function SlidePresenter({ deck, courseId, projectorPath }: SlidePresenterProps) {
  const { state, next, prev, goTo, first, last, toggleBlackout } =
    useSlideState({ totalSlides: deck.slides.length });

  const [showGrid, setShowGrid] = useState(false);
  const projectorWindowRef = useRef<Window | null>(null);

  // Macro state lives in a ref (writes don't need re-renders)
  const macroStateRef = useRef<Record<string, string>>({});
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; });

  // Broadcast current state to DO (fire-and-forget)
  const broadcast = useCallback(() => {
    broadcastSlideStateAction(courseId, {
      slideIndex: stateRef.current.slideIndex,
      blackout: stateRef.current.blackout,
      macroState: macroStateRef.current,
    }).catch(() => {});
  }, [courseId]);

  // Broadcast on slide index / blackout changes
  useEffect(() => {
    broadcast();
  }, [state.slideIndex, state.blackout, broadcast]);

  // Writable macro adapter that broadcasts on every macro write
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

  // Quiz state received via WebSocket (pushed from DO after student submissions)
  const [quizResults, setQuizResults] = useState<QuizResultsDTO | null>(null);
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

  const currentSlide = deck.slides[state.slideIndex];
  const nextSlide = deck.slides[state.slideIndex + 1];
  const slideContext: MacroRenderContext = { readOnly: false };

  const quizMacros = useMemo(
    () => (currentSlide ? findQuizMacros(currentSlide.content) : []),
    [currentSlide],
  );

  return (
    <MacroStateProvider adapter={macroAdapter}>
      <div className={styles.presenter}>
        <header className={styles.header}>
          <h1 className={styles.title}>{deck.title}</h1>
          <PresentationTimer />
          <SlideControls
            slideIndex={state.slideIndex}
            totalSlides={deck.slides.length}
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
            {currentSlide && (
              <SlideRenderer
                header={currentSlide.header}
                content={currentSlide.content}
                context={slideContext}
                slideIndex={state.slideIndex}
              />
            )}
          </main>

          <aside className={styles.sidebar}>
            {quizMacros.length > 0 && (
              <QuizPresenterPanel
                quizMacros={quizMacros}
                courseId={courseId}
                quizResults={quizResults}
              />
            )}

            {currentSlide && (
              <PresenterNotes notes={currentSlide.presenterNotes} />
            )}

            {nextSlide && (
              <div className={styles.nextPreview}>
                <h3 className={styles.nextLabel}>Nächste Folie</h3>
                <p className={styles.nextTitle}>{nextSlide.header}</p>
              </div>
            )}

            <div className={styles.thumbnails}>
              {deck.slides.map((slide, i) => (
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
            slides={deck.slides}
            currentIndex={state.slideIndex}
            onSelect={goTo}
            onClose={() => setShowGrid(false)}
          />
        )}
      </div>
    </MacroStateProvider>
  );
}
