import { Check, FileText, Smartphone, Bookmark } from "lucide-react";
import { Markdown } from "../../content";
import type { FrameBlock } from "../domain/lesson";
import { QuizBlock } from "./FrameQuiz";
import TEXT from "./lessons.de.json";

/** A squared writing surface; a label shows as a small sign on top. */
export function WritingZone({ label }: { label?: string | undefined }) {
  return (
    <div className="lf-zone">
      {label && <span className="lf-zone__label">{label}</span>}
    </div>
  );
}

function Areas({ block }: { block: Extract<FrameBlock, { type: "areas" }> }) {
  const named = block.areas.some((area) => area.markdown);
  return (
    <div className={`lf-areas${named ? " lf-areas--named" : ""}`}>
      {block.areas.map((area) =>
        area.markdown ? (
          <section key={area.label} className="lf-area">
            <h2 className="lf-area__title">{area.label}</h2>
            <Markdown markdown={area.markdown} className="lf-md" />
          </section>
        ) : (
          <WritingZone key={area.label} label={area.label} />
        ),
      )}
    </div>
  );
}

function SheetCard({
  block,
  sent,
}: {
  block: Extract<FrameBlock, { type: "sheet" }>;
  sent: boolean;
}) {
  return (
    <article className="lf-sheet">
      <p className="lf-sheet__kind">
        <FileText aria-hidden="true" />
        {TEXT.frame.sheet}
      </p>
      <p className="lf-sheet__title">{block.title}</p>
      {block.topic && <p className="lf-sheet__topic">{block.topic}</p>}
      <p className={`lf-sheet__state${sent ? " is-sent" : ""}`}>
        {sent ? (
          <Check aria-hidden="true" />
        ) : (
          <Smartphone aria-hidden="true" />
        )}
        {sent ? TEXT.frame.sheetSent : TEXT.frame.sheetWaiting}
      </p>
    </article>
  );
}

/** One content block of a frame. */
export function FrameBlockView({
  block,
  sent,
  frameId,
}: {
  block: FrameBlock;
  sent: boolean;
  frameId: string;
}) {
  switch (block.type) {
    case "markdown":
      return <Markdown markdown={block.markdown} className="lf-md" />;
    case "arrows":
      return (
        <div className="lf-arrows">
          {block.rows.map(([left, right]) => (
            <div key={left} className="lf-arrows__row">
              <Markdown inline markdown={left} />
              <svg
                className="lf-arrows__arrow"
                viewBox="0 0 40 24"
                aria-hidden="true"
              >
                <path d="M2 12H36M26 3L37 12L26 21" />
              </svg>
              <Markdown inline markdown={right} className="lf-arrows__right" />
            </div>
          ))}
        </div>
      );
    case "image":
      return <img className="lf-image" src={block.asset} alt={block.alt} />;
    case "areas":
      return <Areas block={block} />;
    case "merkkarte":
      return (
        <article className="lf-merkkarte">
          <h1 className="lf-merkkarte__title">{block.title}</h1>
          <Markdown markdown={block.rule} className="lf-merkkarte__rule" />
          <p className="lf-merkkarte__hint">
            <Bookmark aria-hidden="true" />
            {TEXT.frame.merkkarteHint}
          </p>
        </article>
      );
    case "sheet":
      return <SheetCard block={block} sent={sent} />;
    case "quiz":
      return <QuizBlock block={block} frameId={frameId} />;
  }
}
