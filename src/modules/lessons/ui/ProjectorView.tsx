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
  if (session.hidden) {
    return <div className="lp lp--hidden" />;
  }
  const order = runningOrder(lesson, session.blanks);
  const entry =
    order.find((item) => entryId(item) === session.currentFrameId) ?? order[0];
  if (!entry) {
    return <div className="lp" />;
  }
  const id = entryId(entry);
  const frame = entry.kind === "frame" ? entry.frame : entry.parent;
  return (
    <div className="lp">
      <LiveQuizContext.Provider value={quiz}>
        <FrameStage>
          <FrameView
            entry={entry}
            lessonTitle={lesson.title}
            sent={session.sent.includes(frame.id)}
          >
            <InkStrokes
              strokes={session.ink.filter((stroke) => stroke.frameId === id)}
              laser={laser}
            />
          </FrameView>
        </FrameStage>
      </LiveQuizContext.Provider>
    </div>
  );
}
