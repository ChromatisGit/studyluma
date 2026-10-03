import { fill } from "../../../helper/text";
import { formatSeconds } from "../domain/clock";
import { entryId, type OrderEntry } from "../domain/layout";
import type { InkStroke, Lesson } from "../domain/lesson";
import { FrameThumb } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkStrokes } from "./InkLayer";
import TEXT from "./lessons.de.json";

/** All frames, grouped by lesson, with their planned time. Teacher only. */
export function Overview({
  lesson,
  order,
  currentId,
  ink,
  sent,
  onGo,
  onClose,
}: {
  lesson: Lesson;
  order: OrderEntry[];
  currentId: string;
  ink: InkStroke[];
  sent: string[];
  onGo: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="lt-overview">
      <div className="lt-overview__head">
        <span className="lt-overview__title">{TEXT.overview.title}</span>
        <span className="lt-overview__private">{TEXT.overview.private}</span>
        <span className="lt-overview__fill" />
        <button
          type="button"
          className="lt-btn lt-btn--quiet"
          onClick={onClose}
        >
          {TEXT.overview.close}
        </button>
      </div>
      {lesson.lessons.map((part) => (
        <section key={part.number} className="lt-overview__lesson">
          <h2 className="lt-overview__lesson-title">
            {fill(TEXT.overview.lesson, { number: part.number })}
          </h2>
          <div className="lt-overview__grid">
            {order
              .filter(
                (entry) =>
                  (entry.kind === "frame" ? entry.frame : entry.parent)
                    .lesson === part.number,
              )
              .map((entry) => {
                const id = entryId(entry);
                const number =
                  entry.kind === "frame" ? entry.frame.number : entry.label;
                const title =
                  entry.kind === "frame" ? entry.frame.title : TEXT.frame.blank;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`lt-overview__item${id === currentId ? " is-current" : ""}`}
                    aria-label={fill(TEXT.overview.frame, { number, title })}
                    onClick={() => onGo(id)}
                  >
                    <FrameThumb width={243}>
                      <FrameView
                        entry={entry}
                        lessonTitle={lesson.title}
                        sent={sent.includes(id)}
                      >
                        <InkStrokes
                          strokes={ink.filter(
                            (stroke) => stroke.frameId === id,
                          )}
                        />
                      </FrameView>
                    </FrameThumb>
                    <span className="lt-overview__caption">
                      <span className="lt-overview__num">{number}</span>
                      <span className="lt-overview__name">{title}</span>
                      {entry.kind === "frame" &&
                        entry.frame.planUntil !== undefined && (
                          <span className="lt-overview__plan">
                            {fill(TEXT.overview.until, {
                              time: formatSeconds(entry.frame.planUntil),
                            })}
                          </span>
                        )}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
