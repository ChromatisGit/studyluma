import { LayoutGrid, MoreHorizontal, UserPlus } from "lucide-react";
import { Link } from "react-router";
import { fill } from "../../../helper/text";
import { formatSeconds, type Period } from "../domain/clock";
import type { JoinInfo } from "../infrastructure/projectorChannel";
import TEXT from "./lessons.de.json";

const clockTime = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

/** One entry of the choice where lesson time starts. */
export type StartChoice = {
  key: string;
  label: string;
  selected: boolean;
  onChoose: () => void;
};

/** The invitation of students: the code, how many joined, and whether the projector shows it. */
export type InviteState = {
  /** The teacher has invited; the code exists. */
  open: boolean;
  code: string | null;
  joined: number;
  onShownProjector: boolean;
  onInvite: () => void;
  onToggleProjector: () => void;
  /** What is shown while the projector shows the invitation; null otherwise. */
  join: JoinInfo | null;
};

export interface LessonHeaderProps {
  title: string;
  position: string;
  seconds: number;
  /** Seconds left of the current slide's plan, negative when over; null without a plan. */
  remaining: number | null;
  /** "3. Stunde · ab 09:50"; null without a timetable. */
  startLabel: string | null;
  startChoices: StartChoice[];
  /** In a detour: the slide of the main deck to return to. */
  detour: { slideNumber: number; onReturn: () => void } | null;
  /** Where the deck on the stage can be switched to, besides the current one. */
  decks: { id: string; title: string; href: string }[];
  /** Absent without a classroom (the Demo). */
  invite: InviteState | null;
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
  overviewPath: string;
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
      </p>
      {props.decks.length > 0 && (
        <>
          <p className="lt-menu__group">{TEXT.menu.switchDeck}</p>
          {props.decks.map((deck) => (
            <Link
              key={deck.id}
              role="menuitem"
              className="lt-menu__item"
              to={deck.href}
              onClick={props.onToggleMenu}
            >
              {deck.title}
            </Link>
          ))}
        </>
      )}
      {props.startLabel && (
        <>
          <p className="lt-menu__group">{TEXT.menu.clockStart}</p>
          {props.startChoices.map((choice) => (
            <button
              key={choice.key}
              type="button"
              role="menuitemradio"
              aria-checked={choice.selected}
              className="lt-menu__item"
              onClick={() => {
                choice.onChoose();
                props.onToggleMenu();
              }}
            >
              {choice.label}
            </button>
          ))}
        </>
      )}
      <Link
        role="menuitem"
        className="lt-menu__item"
        to={props.overviewPath}
        onClick={props.onToggleMenu}
      >
        {TEXT.menu.closeSlides}
      </Link>
      <button
        type="button"
        role="menuitem"
        className="lt-menu__item lt-menu__item--end"
        onClick={props.onEnd}
      >
        {TEXT.menu.end}
      </button>
    </div>
  );
}

/** "Schüler einladen"; once invited, the code and how many have joined. */
function InviteButton({ invite }: { invite: InviteState }) {
  if (!invite.open) {
    return (
      <button type="button" className="lt-pill" onClick={invite.onInvite}>
        <UserPlus className="lt-pill__icon" aria-hidden="true" />
        <strong>{TEXT.header.invite}</strong>
      </button>
    );
  }
  return (
    <button
      type="button"
      className="lt-pill"
      aria-pressed={invite.onShownProjector}
      aria-label={fill(
        invite.onShownProjector
          ? TEXT.header.inviteHide
          : TEXT.header.inviteShow,
        { code: invite.code ?? "" },
      )}
      onClick={invite.onToggleProjector}
    >
      <UserPlus className="lt-pill__icon" aria-hidden="true" />
      <strong className="lt-pill__code">{invite.code}</strong>
      <span className="lt-pill__sub">
        {fill(TEXT.header.joined, { count: invite.joined })}
      </span>
    </button>
  );
}

/** Title and position, lesson time with the time left on the slide, projector, overview, menu. */
export function LessonHeader(props: LessonHeaderProps) {
  const { projector, remaining } = props;
  const late = remaining !== null && remaining < 0 ? "late" : "on-time";
  return (
    <header className="lt-head">
      <div className="lt-head__title">
        <span className="lt-head__name">{props.title}</span>
        <span className="lt-head__position">{props.position}</span>
      </div>
      {props.detour && (
        <button
          type="button"
          className="lt-detour"
          onClick={props.detour.onReturn}
        >
          {fill(TEXT.header.detour, { number: props.detour.slideNumber })}
        </button>
      )}
      <div className="lt-head__clock" title={TEXT.header.clockTitle}>
        <span className="lt-head__clock-label">{TEXT.header.clock}</span>
        <span className="lt-head__time">{formatSeconds(props.seconds)}</span>
        {remaining !== null && (
          <span className={`lt-head__deviation lt-head__deviation--${late}`}>
            {fill(remaining < 0 ? TEXT.header.over : TEXT.header.remaining, {
              time: formatSeconds(Math.abs(remaining)),
            })}
          </span>
        )}
      </div>
      <span className="lt-head__sep" />
      <ProjectorPill
        projector={projector}
        onToggleFreeze={props.onToggleFreeze}
        onOpen={props.onOpenProjector}
      />
      {props.invite && <InviteButton invite={props.invite} />}
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
