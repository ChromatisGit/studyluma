import type { ReactNode } from "react";

/**
 * Linie: the shared "one line" primitive behind the Lernweg (course view)
 * and the roadmap page. Every row draws its own two track halves (above
 * and below its station), so the line stays continuous whatever is open.
 */

/** done = travelled (solid), ahead = upcoming (pale), none = no track. */
export type TrackState = "done" | "ahead" | "none";
export type StopKind = "topic" | "chapter" | "step" | "stub";
/** "here" is the current chapter inside the open current topic. */
export type StopStatus = "done" | "current" | "ahead" | "here";

export interface LinieProps {
  label: string;
  className?: string;
  children: ReactNode;
}

export function Linie({ label, className, children }: LinieProps) {
  return (
    <div className={["linie", className].filter(Boolean).join(" ")}>
      <ol className="linie__list" aria-label={label}>
        {children}
      </ol>
    </div>
  );
}

function stationClass(kind: StopKind, status: StopStatus) {
  if (kind === "stub") {
    return undefined;
  }
  if (kind === "chapter") {
    if (status === "here") {
      return "linie__station linie__station--here";
    }
    return `linie__station linie__station--${status === "done" ? "tick" : "tick-ahead"}`;
  }
  return `linie__station linie__station--${status === "here" ? "current" : status}`;
}

export interface LinieStopProps {
  kind: StopKind;
  status: StopStatus;
  up: TrackState;
  down: TrackState;
  /** Draw the track halves dashed: a line that continues off-screen. */
  dashed?: boolean;
  /** The last stop of an open-ended line trails off dashed below it. */
  trail?: boolean;
  className?: string;
  children: ReactNode;
}

export function LinieStop({
  kind,
  status,
  up,
  down,
  dashed = false,
  trail = false,
  className,
  children,
}: LinieStopProps) {
  // A tick is a side branch off the line; at the very end it would only
  // leave an L-shaped stub, so the line simply ends there.
  const end = down === "none" && !trail && up !== "none";
  const station =
    end && kind === "chapter" && status !== "here"
      ? undefined
      : stationClass(kind, status);
  const isCurrent = status === "current" || status === "here";
  return (
    <li
      className={[
        "linie__row",
        `linie__row--${kind}`,
        kind !== "stub" && `linie__row--${status}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-current={isCurrent ? "step" : undefined}
    >
      <span
        className={[
          "linie__track",
          `lw-up-${up}`,
          `lw-down-${trail ? "trail" : down}`,
          dashed && "lw-stub",
          end && !station && "lw-end",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-hidden="true"
      >
        {station && <span className={station} />}
      </span>
      <div className="linie__content">{children}</div>
    </li>
  );
}

/**
 * Track halves for a sequence of stops with one "here" position: everything
 * before it is travelled, everything after it is ahead.
 */
export function trackFor(
  index: number,
  count: number,
  hereIndex: number,
  { connectTop = true }: { connectTop?: boolean } = {},
): { up: TrackState; down: TrackState } {
  const up: TrackState =
    index === 0 && !connectTop ? "none" : index <= hereIndex ? "done" : "ahead";
  const down: TrackState =
    index === count - 1 ? "none" : index < hereIndex ? "done" : "ahead";
  return { up, down };
}
