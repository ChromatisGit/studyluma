"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlideDeck, SlideMessage } from "@schema/slideTypes";
import type { MacroRenderContext } from "@macros/componentTypes";
import type { QuizMacro } from "@macros/quiz/types";
import { MacroStateProvider } from "@macros/state/MacroStateContext";
import { createPresenterStore, type PresenterStore } from "@macros/state/BroadcastAdapter";
import { QuizPresenterPanel } from "@features/quiz/QuizPresenterPanel";
import { useSlideState } from "./hooks/useSlideState";
import { useSlideBroadcast } from "./hooks/useSlideBroadcast";
import { useSlideKeyboard } from "./hooks/useSlideKeyboard";
import { SlideRenderer } from "./components/SlideRenderer";
import { SlideControls } from "./components/SlideControls";
import { PresenterNotes } from "./components/PresenterNotes";
import { PresentationTimer } from "./components/PresentationTimer";
import { SlideOverviewGrid } from "./components/SlideOverviewGrid";
import styles from "./SlidePresenter.module.css";

type SlidePresenterProps = {
  deck: SlideDeck;
  channelName: string;
  projectorPath: string;
  courseId: string;
};

/** Collect all QuizMacro nodes from slide content (including inside MacroGroups). */
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

export function SlidePresenter({
  deck,
  channelName,
  projectorPath,
  courseId,
}: SlidePresenterProps) {
  const { state, next, prev, goTo, first, last, toggleBlackout } =
    useSlideState({ totalSlides: deck.slides.length });

  const [showGrid, setShowGrid] = useState(false);
  const projectorWindowRef = useRef<Window | null>(null);
  const [store] = useState<PresenterStore>(createPresenterStore);

  const { postMessage } = useSlideBroadcast({
    channelName,
    role: "presenter",
    onMessage: (msg: SlideMessage) => {
      if (msg.type === "SYNC_REQUEST") {
        postMessage({
          type: "SYNC_RESPONSE",
          state: { ...state, interactiveState: store.getState() },
        });
      }
    },
  });

  // Wire up broadcast: when a macro writes, push interactive state to projector
  useEffect(() => {
    store.setBroadcast((interactiveState) => {
      postMessage({
        type: "STATE_UPDATE",
        state: { ...state, interactiveState },
      });
    });
  }, [store, postMessage, state]);

  // Broadcast on slide/blackout state change
  useEffect(() => {
    postMessage({
      type: "STATE_UPDATE",
      state: { ...state, interactiveState: store.getState() },
    });
  }, [state, postMessage, store]);

  const openProjector = useCallback(() => {
    const w = window.open(projectorPath, "studynode-projector", "popup");
    if (w) projectorWindowRef.current = w;
  }, [projectorPath]);

  const handleBlackout = useCallback(() => {
    toggleBlackout();
    postMessage({ type: "BLACKOUT", blackout: !state.blackout });
  }, [toggleBlackout, postMessage, state.blackout]);

  const handleFullscreen = useCallback(() => {
    postMessage({ type: "FULLSCREEN_REQUEST" });
  }, [postMessage]);

  useSlideKeyboard({
    onNext: next,
    onPrev: prev,
    onFirst: first,
    onLast: last,
    onBlackout: handleBlackout,
    onFullscreen: handleFullscreen,
    onGrid: () => setShowGrid((v) => !v),
    onLaser: () => {
      /* laser pointer toggle — future */
    },
  });

  const currentSlide = deck.slides[state.slideIndex];
  const nextSlide = deck.slides[state.slideIndex + 1];
  const slideContext: MacroRenderContext = { readOnly: false };

  const quizMacros = useMemo(
    () => (currentSlide ? findQuizMacros(currentSlide.content) : []),
    [currentSlide],
  );

  return (
    <MacroStateProvider adapter={store.adapter}>
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
            onFullscreen={handleFullscreen}
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
                channelName={channelName}
                courseId={courseId}
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
