import { useTeacherQuiz } from "../../classroom";
import { useProjectorFeed } from "../application/useLessonSession";
import type { Deck } from "../domain/deck";
import { entryId, entrySlide, runningOrder } from "../domain/layout";
import { ScrollSyncContext } from "./FrameBlocks";
import { LiveQuizContext } from "./FrameQuiz";
import { FrameStage } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkStrokes } from "./InkLayer";
import TEXT from "./lessons.de.json";
import "./lessons.css";

/**
 * The projector window: the current slide, full size, with ink and the
 * laser pointer. No controls, no notes; blanked shows a calm empty surface.
 */
export function ProjectorView({
  courseId,
  deck,
}: {
  courseId: string;
  deck: Deck;
}) {
  const { session, laser, scroll } = useProjectorFeed(deck.id);
  const { view } = useTeacherQuiz(courseId);
  const quiz =
    view && !view.ended && view.chapterId === deck.chapterId ? view : null;
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
  return (
    <div className="lp">
      <LiveQuizContext.Provider value={{ view: quiz, teacher: false }}>
        <ScrollSyncContext.Provider value={{ follow: scroll }}>
          <FrameStage>
            <FrameView
              entry={entry}
              deckTitle={deck.title}
              sent={display.sent.includes(entrySlide(entry).id)}
            >
              <InkStrokes
                strokes={display.ink.filter((stroke) => stroke.frameId === id)}
                laser={laser}
              />
            </FrameView>
          </FrameStage>
        </ScrollSyncContext.Provider>
      </LiveQuizContext.Provider>
    </div>
  );
}
