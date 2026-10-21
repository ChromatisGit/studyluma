import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { Check, Clock, FileText, Smartphone } from "lucide-react";
import type { Merkkarte, RichNode, SlideSegment } from "../../catalog";
import { RichContent, SummaryContent } from "../../content-renderer";
import type { Slide } from "../domain/deck";
import { columnWidths, isFill } from "../domain/layout";
import { fill } from "../../../helper/text";
import { QuizBlock } from "./FrameQuiz";
import TEXT from "./lessons.de.json";

/** The Merkkarten that the text of the current slide places, by id. */
export const CardsContext = createContext<Record<string, Merkkarte>>({});

/** Free space between two parts of a slide (`::platz`): 120px per block. */
export const SPACE_BLOCK = 120;

/**
 * A Merkkarte inside a slide, built like the cards of the Inhalt: the rule
 * under the title, the examples below it, all open because nothing here
 * can be clicked.
 */
export function MerkkarteCard({ card }: { card: Merkkarte }) {
  return (
    <article className="lf-card">
      <h2 className="lf-card__title">{card.title}</h2>
      <RichContent nodes={card.rule} className="lf-card__rule" />
      {card.examples.length > 0 && (
        <div className="lf-card__examples">
          {card.examples.map((example, i) => (
            <RichContent key={i} nodes={example} className="lf-card__example" />
          ))}
        </div>
      )}
    </article>
  );
}

type Group =
  | { kind: "nodes"; nodes: RichNode[] }
  | { kind: "space"; size: number }
  | { kind: "cards"; ids: string[] };

/** Text, free space and Merkkarten in the order the author wrote them. */
function groupNodes(nodes: RichNode[]): Group[] {
  const groups: Group[] = [];
  for (const node of nodes) {
    const last = groups.at(-1);
    if (node.type === "space") {
      groups.push({ kind: "space", size: node.size });
    } else if (node.type === "merkkarteCard") {
      if (last?.kind === "cards") {
        last.ids.push(node.targetId);
      } else {
        groups.push({ kind: "cards", ids: [node.targetId] });
      }
    } else if (last?.kind === "nodes") {
      last.nodes.push(node);
    } else {
      groups.push({ kind: "nodes", nodes: [node] });
    }
  }
  return groups;
}

function Nodes({
  nodes,
  className,
}: {
  nodes: RichNode[];
  className?: string;
}) {
  const cards = useContext(CardsContext);
  return (
    <>
      {groupNodes(nodes).map((group, i) => {
        if (group.kind === "space") {
          return (
            <div
              key={i}
              className="lf-space"
              style={{ height: group.size * SPACE_BLOCK }}
              aria-hidden="true"
            />
          );
        }
        if (group.kind === "cards") {
          const found = group.ids.flatMap((id) => cards[id] ?? []);
          return (
            <div
              key={i}
              className={`lf-cards${found.length === 1 ? " lf-cards--single" : ""}`}
            >
              {found.map((card) => (
                <MerkkarteCard key={card.id} card={card} />
              ))}
            </div>
          );
        }
        return (
          <RichContent
            key={i}
            nodes={group.nodes}
            className={className ?? "lf-md"}
          />
        );
      })}
    </>
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

function ColumnsView({
  columns,
  centered,
}: {
  columns: Extract<SlideSegment, { type: "columns" }>["columns"];
  centered: boolean | undefined;
}) {
  return (
    <div
      className={`lf__columns${centered ? " lf__columns--center" : ""}`}
      style={{ gridTemplateColumns: columnWidths(columns) }}
    >
      {columns.map((column, i) => {
        const fills = isFill({ type: "content", content: column.content });
        return (
          <div
            key={i}
            className={`lf__column${fills ? " lf__column--fill" : ""}`}
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
  return <ColumnsView columns={segment.columns} centered={segment.centered} />;
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

/** "15 Minuten" for the time a slide is planned for. */
const minutes = (seconds: number) =>
  fill(TEXT.frame.sheetMinutes, {
    minutes: Math.max(1, Math.round(seconds / 60)),
  });

/**
 * What the class sees while the worksheet is not on the projector: which
 * sheet, how long they have and that it opens on their own device.
 */
export function SheetCard({ slide, sent }: { slide: Slide; sent: boolean }) {
  return (
    <article className="lf-sheet">
      <FileText className="lf-sheet__icon" aria-hidden="true" />
      <p className="lf-sheet__title">{TEXT.frame.sheet}</p>
      <ul className="lf-sheet__facts">
        <li className={sent ? "is-sent" : undefined}>
          {sent ? (
            <Check aria-hidden="true" />
          ) : (
            <Smartphone aria-hidden="true" />
          )}
          {sent ? TEXT.frame.sheetSent : TEXT.frame.sheetWaiting}
        </li>
        {slide.budget !== undefined && (
          <li>
            <Clock aria-hidden="true" />
            {minutes(slide.budget)}
          </li>
        )}
      </ul>
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
