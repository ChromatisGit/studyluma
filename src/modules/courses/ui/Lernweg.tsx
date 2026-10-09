import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown } from "lucide-react";
import { Badge, Tabs } from "@chromatis/base/ui";
import { fill } from "../../../helper/text";
import { Linie, LinieStop, trackFor, type TrackState } from "./Linie";
import {
  lernwegPosition,
  lernwegRows,
  type LernwegPhase,
  type LernwegRow,
} from "./lernwegRows";
import { Pictogram } from "./Pictogram";
import TEXT from "./courses.de.json";

export type { LernwegChapter, LernwegPhase, LernwegTopic } from "./lernwegRows";

export interface LernwegProps {
  /** Accessible name of the line, e.g. "Lernweg Mathematik". */
  label: string;
  badge?: string | undefined;
  badgeLabel?: string | undefined;
  phases: LernwegPhase[];
  /** Where the class is; set by the teacher. */
  currentChapterId: string | null;
}

type Track = { up: TrackState; down: TrackState };

function ChapterRow({
  row,
  track,
}: {
  row: Extract<LernwegRow, { kind: "chapter" }>;
  track: Track;
}) {
  const content = (
    <>
      <span className="lernweg__chapter-num">{row.chapter.number}</span>
      <span className="lernweg__chapter-title">{row.chapter.title}</span>
      {row.status === "here" && (
        <Badge status="info">{TEXT.lernweg.current}</Badge>
      )}
    </>
  );
  const className = [
    "lernweg__chapter",
    row.status === "here" && "lernweg__chapter--current",
    !row.linked && "lernweg__chapter--ahead",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <LinieStop kind="chapter" status={row.status} {...track}>
      {row.linked ? (
        <Link className={className} to={row.chapter.to}>
          {content}
        </Link>
      ) : (
        <span className={className}>{content}</span>
      )}
    </LinieStop>
  );
}

function TopicRow({
  row,
  track,
  onToggle,
}: {
  row: Extract<LernwegRow, { kind: "topic" }>;
  track: Track;
  onToggle: () => void;
}) {
  const inner = (
    <>
      <Pictogram icon={row.topic.pictogram} fallbackLabel={row.topic.title} />
      <span className="lernweg__title">
        <span className="lernweg__num">{row.topic.number}</span>
        <span className="lernweg__title-text">{row.topic.title}</span>
      </span>
    </>
  );
  return (
    <LinieStop kind="topic" status={row.status} {...track}>
      <h3 className="lernweg__heading">
        {row.openable ? (
          <button
            type="button"
            className="lernweg__trigger"
            aria-expanded={row.open}
            onClick={onToggle}
          >
            {inner}
            <ChevronDown className="lernweg__chevron" aria-hidden="true" />
          </button>
        ) : (
          <span className="lernweg__trigger lernweg__trigger--static">
            {inner}
          </span>
        )}
      </h3>
    </LinieStop>
  );
}

/**
 * The Lernweg: one line per course. Topics are a single-open accordion;
 * school years appear as tabs (past years and the current one only), and
 * the line continues dashed into the neighbouring year.
 */
export function Lernweg({
  label,
  badge,
  badgeLabel,
  phases,
  currentChapterId,
}: LernwegProps) {
  const { currentTopic, currentPhaseIndex } = lernwegPosition(
    phases,
    currentChapterId,
  );
  const visible = phases.slice(0, currentPhaseIndex + 1);
  const [selected, setSelected] = useState(visible.at(-1)?.id ?? "");
  const [openTopic, setOpenTopic] = useState<string | null>(
    currentTopic?.id ?? null,
  );

  function select(phaseId: string) {
    setSelected(phaseId);
    setOpenTopic(
      phaseId === phases[currentPhaseIndex]?.id
        ? (currentTopic?.id ?? null)
        : null,
    );
  }

  function renderRow(row: LernwegRow, track: Track) {
    if (row.kind === "stub") {
      const template =
        row.direction === "before" ? TEXT.lernweg.before : TEXT.lernweg.after;
      return (
        <LinieStop key={row.key} kind="stub" status="ahead" {...track} dashed>
          <button
            type="button"
            className="lernweg__stub"
            onClick={() => select(row.phase.id)}
          >
            {fill(template, { label: row.phase.label })}
          </button>
        </LinieStop>
      );
    }
    if (row.kind === "chapter") {
      return <ChapterRow key={row.key} row={row} track={track} />;
    }
    return (
      <TopicRow
        key={row.key}
        row={row}
        track={track}
        onToggle={() => setOpenTopic(row.open ? null : row.topic.id)}
      />
    );
  }

  function renderPhase(phaseIndex: number) {
    const { rows, hereIndex } = lernwegRows(
      phases,
      phaseIndex,
      currentChapterId,
      openTopic,
    );
    return (
      <Linie
        label={label}
        badge={badge}
        badgeLabel={badgeLabel}
        className="lernweg"
      >
        {rows.map((row, index) =>
          renderRow(
            row,
            trackFor(index, rows.length, hereIndex, {
              connectTop: !(index === 0 && row.kind === "stub"),
            }),
          ),
        )}
      </Linie>
    );
  }

  if (visible.length <= 1) {
    return renderPhase(Math.max(0, visible.length - 1));
  }
  return (
    <Tabs
      label={TEXT.lernweg.phases}
      className="lernweg__tabs"
      value={selected}
      onValueChange={select}
      items={visible.map((phase, index) => ({
        id: phase.id,
        label: phase.label,
        content: renderPhase(index),
      }))}
    />
  );
}
