import { LayoutGrid, MoreHorizontal } from "lucide-react";
import { Link } from "react-router";
import { fill } from "../../../helper/text";
import { formatSeconds, type Period } from "../domain/clock";
import TEXT from "./lessons.de.json";

const clockTime = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

export interface LessonHeaderProps {
  title: string;
  position: string;
  seconds: number;
  deviation: number;
  projector: {
    connected: boolean;
    hidden: boolean;
    frozen: boolean;
    number: string;
  };
  onToggleFreeze: () => void;
  onOpenProjector: () => void;
  overviewOpen: boolean;
  onToggleOverview: () => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  period: Period | null;
  onEnd: () => void;
  chapterPath: string;
}

/** Whether a projector window is connected and frozen on its last image. */
function ProjectorPill({
  projector,
  onToggleFreeze,
  onOpen,
}: {
  projector: LessonHeaderProps["projector"];
  onToggleFreeze: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      {projector.connected ? (
        <button
          type="button"
          className={`lt-pill${projector.frozen ? " lt-pill--hidden" : ""}`}
          aria-label={
            projector.frozen ? "Projektor fortsetzen" : "Projektor einfrieren"
          }
          onClick={onToggleFreeze}
        >
          <span className="lt-pill__dot" />
          <strong>
            {projector.frozen ? "Projektor eingefroren" : "Projektor"}
          </strong>
          <kbd>F</kbd>
        </button>
      ) : (
        <span className="lt-pill lt-pill--none">
          <span className="lt-pill__dot" />
          <strong>{TEXT.header.noProjector}</strong>
          <button type="button" className="lt-pill__open" onClick={onOpen}>
            {TEXT.header.openProjector}
          </button>
        </span>
      )}
    </>
  );
}

function LessonMenu(props: LessonHeaderProps) {
  const { projector } = props;
  return (
    <div className="lt-menu" role="menu">
      <p className="lt-menu__info">
        {props.period
          ? fill(TEXT.menu.period, {
              number: props.period.number,
              start: clockTime(props.period.start),
              end: clockTime(props.period.end),
            })
          : TEXT.menu.noPeriod}
        <br />
        {TEXT.menu.single}
      </p>
      <button type="button" role="menuitem" className="lt-menu__item" disabled>
        {TEXT.menu.double}
      </button>
      {!projector.connected && (
        <button
          type="button"
          role="menuitem"
          className="lt-menu__item"
          onClick={props.onOpenProjector}
        >
          {TEXT.menu.openProjector}
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="lt-menu__item"
        onClick={props.onEnd}
      >
        {TEXT.menu.end}
      </button>
      <Link role="menuitem" className="lt-menu__item" to={props.chapterPath}>
        {TEXT.menu.back}
      </Link>
    </div>
  );
}

/** Title and position, lesson time with plan deviation, projector, overview, menu. */
export function LessonHeader(props: LessonHeaderProps) {
  const { projector, deviation } = props;
  const late = deviation > 60 ? "late" : deviation < -60 ? "early" : "on-time";
  return (
    <header className="lt-head">
      <div className="lt-head__title">
        <span className="lt-head__name">{props.title}</span>
        <span className="lt-head__position">{props.position}</span>
      </div>
      <div className="lt-head__clock" title={TEXT.header.clockTitle}>
        <span className="lt-head__clock-label">{TEXT.header.clock}</span>
        <span className="lt-head__time">{formatSeconds(props.seconds)}</span>
        <span className={`lt-head__deviation lt-head__deviation--${late}`}>
          {formatSeconds(deviation, true)}
        </span>
      </div>
      <span className="lt-head__sep" />
      <ProjectorPill
        projector={projector}
        onToggleFreeze={props.onToggleFreeze}
        onOpen={props.onOpenProjector}
      />
      <button
        type="button"
        className="lt-icon-btn"
        aria-label={TEXT.header.overview}
        aria-pressed={props.overviewOpen}
        onClick={props.onToggleOverview}
      >
        <LayoutGrid aria-hidden="true" />
        <kbd>G</kbd>
      </button>
      <button
        type="button"
        className="lt-icon-btn"
        aria-label={TEXT.header.menu}
        aria-expanded={props.menuOpen}
        onClick={props.onToggleMenu}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      {props.menuOpen && <LessonMenu {...props} />}
    </header>
  );
}
