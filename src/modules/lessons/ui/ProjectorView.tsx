import { useTeacherQuiz } from "../../quiz";
import { useProjectorFeed } from "../application/useLessonSession";
import { entryId, runningOrder } from "../domain/layout";
import type { Lesson } from "../domain/lesson";
import { LiveQuizContext } from "./FrameQuiz";
import { FrameStage } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkStrokes } from "./InkLayer";
import TEXT from "./lessons.de.json";
import "./lessons.css";

/**
 * The projector window: the current frame, full size, with ink and the
 * laser pointer. No controls, no notes; blanked shows a calm empty surface.
 */
export function ProjectorView({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: Lesson;
}) {
  const { session, laser } = useProjectorFeed(lesson.chapterId);
  const { view } = useTeacherQuiz(courseId);
  const quiz =
    view && !view.ended && view.chapterId === lesson.chapterId ? view : null;
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
  const order = runningOrder(lesson, display.blanks);
  const entry =
    order.find((item) => entryId(item) === display.currentFrameId) ?? order[0];
  if (!entry) {
    return <div className="lp" />;
  }
  const id = entryId(entry);
  const frame = entry.kind === "frame" ? entry.frame : entry.parent;
  return (
    <div className="lp">
      <LiveQuizContext.Provider value={{ view: quiz, teacher: false }}>
        <FrameStage>
          <FrameView
            entry={entry}
            lessonTitle={lesson.title}
            sent={display.sent.includes(frame.id)}
          >
            <InkStrokes
              strokes={display.ink.filter((stroke) => stroke.frameId === id)}
              laser={laser}
            />
          </FrameView>
        </FrameStage>
      </LiveQuizContext.Provider>
    </div>
  );
}
