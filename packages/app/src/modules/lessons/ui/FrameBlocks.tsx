import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Check, FileText, Smartphone } from "lucide-react";
import type { Merkkarte, RichNode, SlideSegment } from "../../catalog";
import { RichContent, SummaryContent } from "../../content-renderer";
import type { Slide } from "../domain/deck";
import { isFill } from "../domain/layout";
import { QuizBlock } from "./FrameQuiz";
import TEXT from "./lessons.de.json";

/** A squared writing surface (`::schreiben`); a label shows as a small sign on top. */
export function WritingZone({ label }: { label?: string | undefined }) {
  return (
    <div className="lf-zone">
      {label && <span className="lf-zone__label">{label}</span>}
    </div>
  );
}

/**
 * Scrolling of the Inhalt follows the teacher on the projector: the
 * teacher's window reports how far it is scrolled, the projector copies it.
 */
export const ScrollSyncContext = createContext<{
  report?: (slideId: string, ratio: number) => void;
  follow?: { slideId: string; ratio: number } | null;
}>({});

/** Content nodes in order; `::schreiben` becomes a writing zone between them. */
function Nodes({
  nodes,
  className,
}: {
  nodes: RichNode[];
  className?: string;
}) {
  const groups: (RichNode[] | { label: string | undefined })[] = [];
  for (const node of nodes) {
    if (node.type === "writingArea") {
      groups.push({ label: node.label });
    } else {
      const last = groups.at(-1);
      if (Array.isArray(last)) {
        last.push(node);
      } else {
        groups.push([node]);
      }
    }
  }
  return (
    <>
      {groups.map((group, i) =>
        Array.isArray(group) ? (
          <RichContent key={i} nodes={group} className={className ?? "lf-md"} />
        ) : (
          <WritingZone key={i} label={group.label} />
        ),
      )}
    </>
  );
}

/** One piece of a slide's text: running content or a column layout. */
export function SegmentView({ segment }: { segment: SlideSegment }) {
  if (segment.type === "content") {
    return isFill(segment) ? (
      <div className="lf__fill">
        <RichContent nodes={segment.content} className="lf-md" />
      </div>
    ) : (
      <Nodes nodes={segment.content} />
    );
  }
  return (
    <div
      className="lf__columns"
      style={{
        gridTemplateColumns: segment.columns
          .map((column) => `${column.width}fr`)
          .join(" "),
      }}
    >
      {segment.columns.map((column, i) => {
        const fill = isFill({ type: "content", content: column.content });
        return (
          <div
            key={i}
            className={`lf__column${fill ? " lf__column--fill" : ""}`}
          >
            {column.title && (
              <h2 className="lf__column-title">{column.title}</h2>
            )}
            <Nodes nodes={column.content} />
          </div>
        );
      })}
    </div>
  );
}

export function SegmentsView({ segments }: { segments: SlideSegment[] }) {
  return (
    <>
      {segments.map((segment, i) => (
        <SegmentView key={i} segment={segment} />
      ))}
    </>
  );
}

/** The Arbeitsblatt as the class sees it: a card that says where they are. */
export function SheetCard({ slide, sent }: { slide: Slide; sent: boolean }) {
  return (
    <article className="lf-sheet">
      <p className="lf-sheet__kind">
        <FileText aria-hidden="true" />
        {TEXT.frame.sheet}
      </p>
      <p className="lf-sheet__title">{slide.title}</p>
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

/** A Merkkarte large: the rule, then its examples. */
export function MerkkarteCard({
  card,
}: {
  card: Pick<Merkkarte, "title" | "rule" | "examples">;
}) {
  return (
    <article className="lf-merkkarte">
      <h1 className="lf-merkkarte__title">{card.title}</h1>
      <RichContent nodes={card.rule} className="lf-merkkarte__rule" />
      {card.examples.map((example, i) => (
        <RichContent
          key={i}
          nodes={example}
          className="lf-merkkarte__example"
        />
      ))}
    </article>
  );
}

/** The chapter's Inhalt, scrollable; the class never scrolls it itself. */
export function InhaltView({ slide }: { slide: Slide }): ReactNode {
  const { report, follow } = useContext(ScrollSyncContext);
  const box = useRef<HTMLDivElement>(null);
  const ratio = follow?.slideId === slide.id ? follow.ratio : null;
  useEffect(() => {
    const element = box.current;
    if (element && ratio !== null) {
      element.scrollTop = ratio * (element.scrollHeight - element.clientHeight);
    }
  }, [ratio]);
  if (!slide.summary) {
    return null;
  }
  return (
    <div
      className="lf-summary"
      ref={box}
      onScroll={(event) => {
        const element = event.currentTarget;
        const room = element.scrollHeight - element.clientHeight;
        report?.(slide.id, room > 0 ? element.scrollTop / room : 0);
      }}
    >
      <SummaryContent summary={slide.summary} />
    </div>
  );
}

export { QuizBlock };
