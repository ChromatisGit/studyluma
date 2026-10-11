import { fill } from "../../../helper/text";
import { formatSeconds } from "../domain/clock";
import type { Deck } from "../domain/deck";
import { entryId, entrySlide, type OrderEntry } from "../domain/layout";
import type { InkStroke } from "../domain/lesson";
import { FrameThumb } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkStrokes } from "./InkLayer";
import TEXT from "./lessons.de.json";

/** Consecutive slides that came through the same inclusions share a section. */
function sections(order: OrderEntry[], deckTitle: string) {
  const out: { name: string; entries: OrderEntry[] }[] = [];
  for (const entry of order) {
    const from = entrySlide(entry).from;
    const name = from.length ? from.join(" › ") : deckTitle;
    const last = out.at(-1);
    if (last?.name === name) {
      last.entries.push(entry);
    } else {
      out.push({ name, entries: [entry] });
    }
  }
  return out;
}

/** All slides with their planned time, grouped by where they come from. Teacher only. */
export function Overview({
  deck,
  order,
  currentId,
  ink,
  sent,
  onGo,
  onClose,
}: {
  deck: Deck;
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
      {sections(order, deck.title).map((section, at) => (
        <section key={`${at}-${section.name}`} className="lt-overview__lesson">
          <h2 className="lt-overview__lesson-title">
            {section.name === deck.title
              ? section.name
              : fill(TEXT.overview.included, { name: section.name })}
          </h2>
          <div className="lt-overview__grid">
            {section.entries.map((entry) => {
              const id = entryId(entry);
              const slide = entrySlide(entry);
              const number =
                entry.kind === "slide" ? String(slide.number) : entry.label;
              const title =
                entry.kind === "slide" ? slide.title : TEXT.frame.blank;
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
                      deckTitle={deck.title}
                      sent={sent.includes(id)}
                    >
                      <InkStrokes
                        strokes={ink.filter((stroke) => stroke.frameId === id)}
                      />
                    </FrameView>
                  </FrameThumb>
                  <span className="lt-overview__caption">
                    <span className="lt-overview__num">{number}</span>
                    <span className="lt-overview__name">{title}</span>
                    {entry.kind === "slide" &&
                      slide.planUntil !== undefined && (
                        <span className="lt-overview__plan">
                          {fill(TEXT.overview.until, {
                            time: formatSeconds(slide.planUntil),
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
