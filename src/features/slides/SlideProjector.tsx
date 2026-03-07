"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { SlideDeck, SlideMessage, SlideState } from "@schema/slideTypes";
import type { MacroRenderContext } from "@macros/componentTypes";
import { MacroStateProvider } from "@macros/state/MacroStateContext";
import { createProjectorAdapter } from "@macros/state/BroadcastAdapter";
import { QuizProjectorOverlay } from "@features/quiz/QuizProjectorOverlay";
import { useSlideBroadcast } from "./hooks/useSlideBroadcast";
import { SlideRenderer } from "./components/SlideRenderer";
import { LaserPointer } from "./components/LaserPointer";
import styles from "./SlideProjector.module.css";

type SlideProjectorProps = {
  deck: SlideDeck;
  channelName: string;
};

export function SlideProjector({ deck, channelName }: SlideProjectorProps) {
  const [state, setState] = useState<SlideState>({
    slideIndex: 0,
    blackout: false,
    interactiveState: {},
  });

  const [synced, setSynced] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const { postMessage } = useSlideBroadcast({
    channelName,
    role: "projector",
    onSessionExpired: useCallback(() => setSessionExpired(true), []),
    onMessage: useCallback((msg: SlideMessage) => {
      switch (msg.type) {
        case "STATE_UPDATE":
          setState(msg.state);
          setSynced(true);
          break;
        case "SLIDE_CHANGE":
          setState((prev) => ({ ...prev, slideIndex: msg.slideIndex }));
          break;
        case "BLACKOUT":
          setState((prev) => ({ ...prev, blackout: msg.blackout }));
          break;
        case "SYNC_RESPONSE":
          setState(msg.state);
          setSynced(true);
          break;
        case "FULLSCREEN_REQUEST":
          document.documentElement.requestFullscreen?.().catch(() => {});
          break;
      }
    }, []),
  });

  // Request sync on mount, retry until synced
  useEffect(() => {
    if (synced) return;

    postMessage({ type: "SYNC_REQUEST" });
    const interval = setInterval(() => {
      postMessage({ type: "SYNC_REQUEST" });
    }, 500);

    return () => clearInterval(interval);
  }, [synced, postMessage]);

  const currentSlide = deck.slides[state.slideIndex];
  const slideContext: MacroRenderContext = { readOnly: true };

  const projectorAdapter = useMemo(
    () => createProjectorAdapter(state.interactiveState),
    [state.interactiveState]
  );

  return (
    <MacroStateProvider adapter={projectorAdapter}>
      <div className={styles.projector}>
        {state.blackout && <div className={styles.blackout} />}
        {sessionExpired && (
          <div className={styles.expired}>
            <p>Präsentation beendet</p>
            <button type="button" onClick={() => window.location.reload()}>
              Neu laden
            </button>
          </div>
        )}
        {currentSlide && (
          <SlideRenderer
            header={currentSlide.header}
            content={currentSlide.content}
            context={slideContext}
            slideIndex={state.slideIndex}
          />
        )}
        <QuizProjectorOverlay channelName={channelName} />
        <LaserPointer position={state.pointer} />
      </div>
    </MacroStateProvider>
  );
}
