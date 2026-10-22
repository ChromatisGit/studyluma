import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useProjectorFeed } from "../application/useLessonSession";
import type { Deck } from "../domain/deck";
import { entryId, entrySlide, runningOrder } from "../domain/layout";
import { ScrollSyncContext } from "./FrameBlocks";
import { LiveQuizContext } from "./FrameQuiz";
import { FrameStage } from "./FrameStage";
import { FrameView } from "./FrameView";
import { ComponentSlideContext } from "./ComponentSlide";
import { GraphicSlideContext } from "./GraphicSlide";
import { JoinView } from "./JoinView";
import { SheetEmbed } from "./SheetEmbed";
import { InkStrokes } from "./InkLayer";
import TEXT from "./lessons.de.json";
import "./lessons.css";

/**
 * The projector window: the current slide, full size, with ink and the
 * laser pointer. No controls, no notes; blanked shows a calm empty surface.
 */
export function ProjectorView({
  deck,
  chapterPath,
}: {
  deck: Deck;
  chapterPath: string;
}) {
  const { feed, join, quiz: view, laser, scroll } = useProjectorFeed();
  const navigate = useNavigate();
  // The teacher window sends the quiz; the projector holds no session of its own.
  const quiz = view && view.chapterId === deck.chapterId ? view : null;
  // The teacher moved to another deck of the unit: follow to its page.
  const elsewhere = !!feed && feed.presentationId !== deck.id;
  const target = feed?.projectorPath;
  useEffect(() => {
    if (elsewhere && target) {
      void navigate(target, { replace: true });
    }
  }, [elsewhere, target, navigate]);
  if (join) {
    return (
      <div className="lp">
        <FrameStage>
          <JoinView join={join} />
        </FrameStage>
      </div>
    );
  }
  const session = feed && !elsewhere ? feed.deck : null;
  if (!session) {
    return (
      <div className="lp">
        <p className="lp__waiting">{TEXT.projector.waiting}</p>
      </div>
    );
  }
  const display = session.frozen ? { ...session, ...session.frozen } : session;
  if (display.hidden) {
    return <div className="lp lp--hidden" />;
  }
  const order = runningOrder(deck, display.blanks);
  const entry =
    order.find((item) => entryId(item) === display.currentFrameId) ?? order[0];
  if (!entry) {
    return <div className="lp" />;
  }
  const id = entryId(entry);
  const slide = entrySlide(entry);
  const showSheet =
    entry.kind === "slide" &&
    !!slide.worksheet &&
    display.sheetShown === slide.id;
  return (
    <div className="lp">
      <LiveQuizContext.Provider value={{ view: quiz, teacher: false }}>
        <ScrollSyncContext.Provider value={{ follow: scroll }}>
          <FrameStage>
            {showSheet && slide.worksheet ? (
              <SheetEmbed
                src={`${chapterPath}/lesson/sheets/${encodeURIComponent(slide.worksheet.slug)}`}
                slideId={slide.id}
                interactive={false}
              />
            ) : (
              <GraphicSlideContext.Provider
                value={{ changes: display.graphics ?? {} }}
              >
                <ComponentSlideContext.Provider
                  value={{ states: display.components ?? {} }}
                >
                  <FrameView
                    entry={entry}
                    sent={display.sent.includes(entrySlide(entry).id)}
                  >
                    <InkStrokes
                      strokes={display.ink.filter(
                        (stroke) => stroke.frameId === id,
                      )}
                      laser={laser}
                    />
                  </FrameView>
                </ComponentSlideContext.Provider>
              </GraphicSlideContext.Provider>
            )}
          </FrameStage>
        </ScrollSyncContext.Provider>
      </LiveQuizContext.Provider>
    </div>
  );
}
