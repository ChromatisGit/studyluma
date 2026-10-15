import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Dialog } from "@chromatis/base/ui";
import { useNavigate, useRevalidator } from "react-router";
import { fill } from "../../../helper/text";
import { useSite } from "../../classroom";
import { sheetsFor } from "../../courses";
import {
  chapterStore,
  isUnlocked,
  type TaskToBlankMessage,
} from "../../worksheets";
import { useLessonSession } from "../application/useLessonSession";
import {
  beginUnit,
  finishUnit,
  useEndedSessionGuard,
} from "../application/unitLifecycle";
import { deviation, type Period } from "../domain/clock";
import type { Deck } from "../domain/deck";
import {
  entryId,
  entrySlide,
  runningOrder,
  type OrderEntry,
} from "../domain/layout";
import type { DeckState } from "../domain/lesson";
import { openProjectorWindow } from "../infrastructure/projectorChannel";
import { ScrollSyncContext } from "./FrameBlocks";
import { SheetEmbed } from "./SheetEmbed";
import { LiveQuizContext, QuizPreview } from "./FrameQuiz";
import { FrameStage } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkInput, InkStrokes, type InkTool } from "./InkLayer";
import { LessonHeader } from "./LessonHeader";
import { NoUnit } from "./NoUnit";
import { SlideNotes } from "./SlideNotes";
import { planOf, startHeader } from "./startHeader";
import { Overview } from "./Overview";
import { Toolbar } from "./Toolbar";
import { WorksheetMonitoring } from "./WorksheetMonitoring";
import { useFrameQuiz } from "./useFrameQuiz";
import { useInvitation } from "./useInvitation";
import { useSlideActions } from "./useSlideActions";
import { useTeacherKeys, type TeacherKey } from "./useTeacherKeys";
import TEXT from "./lessons.de.json";
import "./lessons.css";

type Dispatch = ReturnType<typeof useLessonSession>["dispatch"];

/** The stage: the slide with ink, the arrows, the blanked note, the overview. */
// Stage overlays share navigation and ink state.
function TeacherStage({
  deck,
  session,
  entry,
  tool,
  hasPrevious,
  hasNext,
  overview,
  onCloseOverview,
  dispatch,
  onStep,
  sendLaser,
  monitoring,
  sheet,
}: {
  deck: Deck;
  session: DeckState;
  entry: OrderEntry;
  tool: InkTool;
  hasPrevious: boolean;
  hasNext: boolean;
  overview: boolean;
  onCloseOverview: () => void;
  dispatch: Dispatch;
  onStep: (by: 1 | -1) => void;
  sendLaser: (point: [number, number] | null) => void;
  /** On a worksheet slide the teacher can look at how the class is doing. */
  monitoring?: ReactNode;
  /** The worksheet itself, while it is on the projector. */
  sheet?: ReactNode;
}) {
  const id = entryId(entry);
  const slide = entrySlide(entry);
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const order = runningOrder(deck, session.blanks);
  return (
    <FrameStage className="lt-stage">
      {monitoring ?? sheet ?? (
        <FrameView entry={entry} sent={session.sent.includes(slide.id)}>
          <InkStrokes strokes={strokes} />
          <InkInput
            tool={tool}
            frameId={id}
            strokes={strokes}
            onStroke={(stroke) => dispatch({ type: "stroke", stroke })}
            onErase={(strokeId) => dispatch({ type: "erase", strokeId })}
            onLaser={sendLaser}
          />
        </FrameView>
      )}
      {tool === "cursor" && hasPrevious && (
        <button
          type="button"
          className="lt-arrow lt-arrow--prev"
          aria-label={TEXT.stage.previous}
          onClick={() => onStep(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
      )}
      {tool === "cursor" && hasNext && (
        <button
          type="button"
          className="lt-arrow lt-arrow--next"
          aria-label={TEXT.stage.next}
          onClick={() => onStep(1)}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      )}
      {session.hidden && (
        <div className="lt-hidden">
          <strong>{TEXT.stage.hidden}</strong>
          <span>{TEXT.stage.hiddenHint}</span>
        </div>
      )}
      {overview && (
        <Overview
          deck={deck}
          order={order}
          currentId={id}
          ink={session.ink}
          sent={session.sent}
          onGo={(target) => {
            dispatch({ type: "go", frameId: target });
            onCloseOverview();
          }}
          onClose={onCloseOverview}
        />
      )}
    </FrameStage>
  );
}

/** Tool, overview and menu state, and what each key does. */
function useTeacherControls(dispatch: Dispatch, onStep: (by: 1 | -1) => void) {
  const [tool, setTool] = useState<InkTool>("cursor");
  const [overview, setOverview] = useState(false);
  const [menu, setMenu] = useState(false);

  const onKey = useCallback(
    (key: TeacherKey) => {
      if (key === "escape") {
        setOverview(false);
        setMenu(false);
      } else if (key === "next" || key === "previous") {
        onStep(key === "next" ? 1 : -1);
      } else if (key === "hide") {
        dispatch({ type: "toggleHidden" });
      } else if (key === "freeze") {
        dispatch({ type: "toggleFreeze" });
      } else if (key === "overview") {
        setOverview((open) => !open);
      } else {
        dispatch({ type: "addBlank" });
        setTool((current) =>
          current === "graphit" || current === "violett" || current === "signal"
            ? current
            : "graphit",
        );
      }
    },
    [dispatch, onStep],
  );
  useTeacherKeys(onKey);

  return { tool, setTool, overview, setOverview, menu, setMenu, onKey };
}

/** "Folie 3 von 12 · Baustein" or "Freie Fläche 5a". */
function positionText(deck: Deck, entry: OrderEntry): string {
  if (entry.kind === "blank") {
    return fill(TEXT.header.branch, { label: entry.label });
  }
  const from = entry.slide.from.length
    ? ` · ${entry.slide.from.join(" › ")}`
    : "";
  return `${fill(TEXT.header.position, {
    number: entry.slide.number,
    total: deck.slides.length,
  })}${from}`;
}

export interface TeacherViewProps {
  /** The course whose students take part in the quiz. */
  courseId: string;
  /** The deck on the stage. */
  deck: Deck;
  /** The unit's main deck, whose plan the clock follows; the same deck outside a detour. */
  mainDeck: Deck;
  periods: Period[];
  /** The other decks of the course the unit can visit. */
  targets: { id: string; title: string; path: string }[];
  /** This page, to come back to. */
  lessonPath: string;
  projectorPath: string;
  chapterPath: string;
  overviewPath: string;
  initialFrameId?: string | undefined;
}

/**
 * The lesson workspace: a compact head, the notes strip, the 16:9 stage
 * as large as possible and a narrow toolbar. No footer.
 */
// The teaching workspace coordinates the lesson primitives.
// eslint-disable-next-line max-lines-per-function
export function TeacherView({
  courseId,
  deck,
  mainDeck,
  periods,
  targets,
  lessonPath,
  projectorPath,
  chapterPath,
  overviewPath,
  initialFrameId,
}: TeacherViewProps) {
  const site = useSite();
  const {
    unit,
    session,
    dispatch,
    sendLaser,
    sendScroll,
    sendJoin,
    setClockStart,
    clock,
    projectorConnected,
  } = useLessonSession(
    { deck, path: lessonPath, projectorPath },
    periods,
    initialFrameId,
  );
  useEndedSessionGuard(unit);
  const invite = useInvitation(sendJoin);
  const quiz = useFrameQuiz(courseId, deck, session, dispatch);
  const { tool, setTool, overview, setOverview, menu, setMenu, onKey } =
    useTeacherControls(dispatch, quiz.onStep);
  const [notesForced, setNotesForced] = useState(false);
  const [classView, setClassView] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const [ready, setReady] = useState(false);
  const [startFailed, setStartFailed] = useState(false);
  useEffect(() => setReady(true), []);
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const access = chapterStore(deck.chapterId);
  const state = useSyncExternalStore(
    access.subscribe,
    access.getSnapshot,
    access.getServerSnapshot,
  );
  const sheets = useMemo(
    () => sheetsFor(site, courseId, deck.chapterId),
    [site, courseId, deck.chapterId],
  );
  const order = runningOrder(deck, session?.blanks ?? []);
  const index = Math.max(
    0,
    order.findIndex((item) => entryId(item) === session?.currentFrameId),
  );
  const entry = order[index];
  const slide = entry ? entrySlide(entry) : undefined;
  const sheetOpen =
    !!sheets &&
    !!slide?.worksheet &&
    isUnlocked(sheets, slide.worksheet, state);
  const sheetShown =
    !!slide?.worksheet && session?.sheetShown === slide.id && !classView;
  const actions = useSlideActions(deck, courseId, slide, sheetOpen, dispatch, {
    shown: !!slide?.worksheet && session?.sheetShown === slide.id,
    classView,
    onClassView: setClassView,
  });
  const currentId = session?.currentFrameId;
  // The class view belongs to the slide it was opened on.
  useEffect(() => setClassView(false), [currentId]);
  // A task taken from the shown worksheet becomes a blank surface after the slide.
  useEffect(() => {
    const onMessage = (event: MessageEvent<TaskToBlankMessage>) => {
      const message = event.data;
      if (
        event.origin === window.location.origin &&
        message?.source === "studyluma-sheet" &&
        message.type === "task-to-blank"
      ) {
        dispatch({
          type: "addBlank",
          task: { sheetId: message.sheetId, taskId: message.taskId },
        });
        setTool("graphit");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [dispatch, setTool]);
  const scrollSync = useMemo(() => ({ report: sendScroll }), [sendScroll]);

  if (!unit) {
    return ready ? (
      <NoUnit
        failed={startFailed}
        overviewPath={overviewPath}
        onStart={() =>
          void beginUnit({
            courseId,
            presentationId: deck.id,
            path: lessonPath,
            periods,
            classroom: site.classroomEnabled,
            existingCode:
              site.classroom?.role === "controller"
                ? site.classroom.code
                : null,
            refresh: async () => {
              await revalidator.revalidate();
            },
          }).then((started) => setStartFailed(!started))
        }
      />
    ) : (
      <div className="lt" />
    );
  }
  if (!session || !entry || !slide) {
    return <div className="lt" />;
  }
  const id = entryId(entry);
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const next = order[index + 1];
  const previous = order[index - 1];
  const number = entry.kind === "slide" ? String(slide.number) : entry.label;
  const monitoring =
    entry.kind === "slide" && slide.worksheet && classView ? (
      <WorksheetMonitoring sheet={slide.worksheet} unlocked={sheetOpen} />
    ) : undefined;
  const sheet =
    entry.kind === "slide" && slide.worksheet && sheetShown ? (
      <SheetEmbed
        src={`${chapterPath}/lesson/sheets/${encodeURIComponent(slide.worksheet.slug)}`}
        slideId={slide.id}
        interactive
      />
    ) : undefined;
  const inkSlide = !monitoring && !sheet && slide.kind !== "quiz";
  const openProjector = () => {
    setMenu(false);
    void openProjectorWindow(projectorPath);
  };

  const { planDeck, planState, planSlide, detour } = planOf(
    unit,
    deck,
    mainDeck,
  );
  const { startLabel, choices } = startHeader(unit, periods, setClockStart);

  return (
    <div className="lt">
      <LessonHeader
        title={deck.title}
        position={positionText(deck, entry)}
        seconds={clock.seconds}
        deviation={
          planSlide
            ? deviation(planDeck, planSlide, planState.enteredAt, clock.seconds)
            : 0
        }
        startLabel={startLabel}
        startChoices={choices}
        detour={
          detour && planSlide
            ? {
                slideNumber: planSlide.number,
                onReturn: () => void navigate(unit.mainPath),
              }
            : null
        }
        decks={targets.map((target) => ({
          id: target.id,
          title: target.title,
          href:
            target.id === unit.mainPresentationId
              ? unit.mainPath
              : `${target.path}&main=${encodeURIComponent(unit.mainPresentationId)}`,
        }))}
        invite={invite}
        projector={{
          connected: projectorConnected,
          hidden: session.hidden,
          frozen: !!session.frozen,
          number,
        }}
        onToggleFreeze={() => dispatch({ type: "toggleFreeze" })}
        onOpenProjector={openProjector}
        overviewOpen={overview}
        onToggleOverview={() => setOverview(!overview)}
        menuOpen={menu}
        onToggleMenu={() => setMenu(!menu)}
        period={clock.period}
        onEnd={() => {
          setMenu(false);
          setEndConfirm(true);
        }}
        overviewPath={overviewPath}
      />
      <SlideNotes
        entry={entry}
        next={next}
        visible={projectorConnected || notesForced}
        onShowAnyway={() => setNotesForced(true)}
        dispatch={dispatch}
        quiz={quiz.actions}
        actions={actions}
        extra={
          slide.quiz && entry.kind === "slide" ? (
            <>
              <p className="lt-notes__sub">{TEXT.quiz.prepared}</p>
              <QuizPreview quiz={slide.quiz} />
            </>
          ) : undefined
        }
        onNext={() => quiz.onStep(1)}
      />
      <main className="lt-main">
        <LiveQuizContext.Provider value={{ view: quiz.live, teacher: true }}>
          <ScrollSyncContext.Provider value={scrollSync}>
            <TeacherStage
              deck={deck}
              session={session}
              entry={entry}
              tool={inkSlide ? tool : "cursor"}
              monitoring={monitoring}
              sheet={sheet}
              hasPrevious={!!previous}
              hasNext={!!next}
              overview={overview}
              onCloseOverview={() => setOverview(false)}
              dispatch={dispatch}
              onStep={quiz.onStep}
              sendLaser={sendLaser}
            />
          </ScrollSyncContext.Provider>
        </LiveQuizContext.Provider>
        {inkSlide && (
          <Toolbar
            tool={tool}
            onTool={setTool}
            onUndo={() => dispatch({ type: "undo" })}
            undoRemovesBlank={entry.kind === "blank" && strokes.length === 0}
            onBlank={() => onKey("blank")}
          />
        )}
      </main>
      <Dialog
        open={endConfirm}
        onOpenChange={setEndConfirm}
        closeLabel={TEXT.teacher.close}
        title={TEXT.teacher.endTitle}
        actions={
          <>
            <Button role="secondary" onClick={() => setEndConfirm(false)}>
              {TEXT.teacher.cancel}
            </Button>
            <Button
              onClick={() => {
                void finishUnit(unit).then(() => navigate(overviewPath));
              }}
            >
              {TEXT.teacher.end}
            </Button>
          </>
        }
      >
        <p>{TEXT.teacher.endDescription}</p>
      </Dialog>
    </div>
  );
}
