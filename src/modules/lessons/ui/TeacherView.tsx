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
import { targetStore } from "../../classroom";
import { chapterStore, isUnlocked } from "../../worksheets";
import { useLessonSession } from "../application/useLessonSession";
import { deviation, type Period } from "../domain/clock";
import type { Deck, Slide } from "../domain/deck";
import {
  entryId,
  entrySlide,
  runningOrder,
  type OrderEntry,
} from "../domain/layout";
import type { LessonSession } from "../domain/lesson";
import { openProjectorWindow } from "../infrastructure/projectorChannel";
import { ScrollSyncContext } from "./FrameBlocks";
import { LiveQuizContext } from "./FrameQuiz";
import { FrameStage } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkInput, InkStrokes, type InkTool } from "./InkLayer";
import { LessonHeader } from "./LessonHeader";
import { NotesStrip } from "./NotesStrip";
import { Overview } from "./Overview";
import type { QuizActionsProps } from "./QuizActions";
import { Toolbar } from "./Toolbar";
import { WorksheetMonitoring } from "./WorksheetMonitoring";
import { useFrameQuiz } from "./useFrameQuiz";
import { useTeacherKeys, type TeacherKey } from "./useTeacherKeys";
import TEXT from "./lessons.de.json";
import "./lessons.css";

/** Teacher view on the dark Tafel theme: everything on paper the class sees. */
function useTafelTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = "dark";
    return () => {
      if (previous) {
        root.dataset.theme = previous;
      } else {
        delete root.dataset.theme;
      }
    };
  }, []);
}

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
}: {
  deck: Deck;
  session: LessonSession;
  entry: OrderEntry;
  tool: InkTool;
  hasPrevious: boolean;
  hasNext: boolean;
  overview: boolean;
  onCloseOverview: () => void;
  dispatch: Dispatch;
  onStep: (by: 1 | -1) => void;
  sendLaser: (point: [number, number] | null) => void;
  /** On a worksheet slide the teacher sees how the class is doing. */
  monitoring?: ReactNode;
}) {
  const id = entryId(entry);
  const slide = entrySlide(entry);
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const order = runningOrder(deck, session.blanks);
  return (
    <FrameStage className="lt-stage">
      {monitoring ?? (
        <FrameView
          entry={entry}
          deckTitle={deck.title}
          sent={session.sent.includes(slide.id)}
        >
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

/** What the notes strip offers on this slide besides the notes. */
function useSlideActions(
  deck: Deck,
  courseId: string,
  slide: Slide | undefined,
  sheetOpen: boolean,
  dispatch: Dispatch,
) {
  const site = useSite();
  const revalidator = useRevalidator();
  const target = targetStore(courseId);
  const active = useSyncExternalStore(
    target.subscribe,
    target.getSnapshot,
    target.getServerSnapshot,
  );
  const store = chapterStore(deck.chapterId);
  const worksheet = slide?.worksheet;
  const targetHere =
    !!worksheet && active?.kind === "sheet" && active.id === worksheet.id;
  const released = site.releasedSummaries.includes(deck.chapterId);
  if (worksheet) {
    return (
      <>
        {!sheetOpen && (
          <button
            type="button"
            className="lt-btn lt-btn--quiet"
            onClick={() => store.setUnlocked(worksheet.id, true)}
          >
            Freischalten
          </button>
        )}
        <button
          type="button"
          className="lt-btn"
          onClick={() => {
            if (!sheetOpen) {
              store.setUnlocked(worksheet.id, true);
            }
            target.set(
              targetHere
                ? null
                : {
                    kind: "sheet",
                    id: worksheet.id,
                    chapterId: deck.chapterId,
                  },
            );
            if (slide) {
              dispatch({ type: "send", frameId: slide.id });
            }
          }}
        >
          {targetHere
            ? "Nicht mehr schicken"
            : sheetOpen
              ? "Schüler senden"
              : "Freischalten & Schüler senden"}
        </button>
      </>
    );
  }
  if (slide?.kind === "summary") {
    return released ? (
      <span className="lt-notes__sent">{TEXT.frame.summaryReleased}</span>
    ) : (
      <button
        type="button"
        className="lt-btn"
        onClick={() => {
          const data = new FormData();
          data.set("intent", "releaseSummary");
          data.set("chapterId", deck.chapterId);
          void fetch(`/courses/${encodeURIComponent(courseId)}/overview`, {
            method: "POST",
            body: data,
          }).then((response) => {
            if (response.ok) {
              void revalidator.revalidate();
            }
          });
        }}
      >
        Inhalt für die Klasse freigeben
      </button>
    );
  }
  return undefined;
}

/** The notes strip for the current slide or blank surface. */
function SlideNotes({
  entry,
  next,
  visible,
  onShowAnyway,
  dispatch,
  quiz,
  actions,
  onNext,
}: {
  entry: OrderEntry;
  next: OrderEntry | undefined;
  visible: boolean;
  onShowAnyway: () => void;
  dispatch: Dispatch;
  quiz: QuizActionsProps | undefined;
  actions: ReactNode;
  onNext: () => void;
}) {
  const slide = entrySlide(entry);
  const number = entry.kind === "slide" ? String(slide.number) : entry.label;
  const nextTitle = next
    ? next.kind === "slide"
      ? next.slide.title
      : TEXT.frame.blank
    : undefined;
  return (
    <NotesStrip
      number={number}
      notes={entry.kind === "slide" ? slide.notes : []}
      visible={visible}
      onShowAnyway={onShowAnyway}
      next={nextTitle ? { title: nextTitle } : undefined}
      onNext={onNext}
      back={
        entry.kind === "blank" ? { number: String(slide.number) } : undefined
      }
      onBack={() => dispatch({ type: "go", frameId: slide.id })}
      onSend={() => undefined}
      quiz={quiz}
      actions={actions}
    />
  );
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
  deck: Deck;
  periods: Period[];
  projectorPath: string;
  chapterPath: string;
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
  periods,
  projectorPath,
  chapterPath,
  initialFrameId,
}: TeacherViewProps) {
  useTafelTheme();
  const site = useSite();
  const {
    session,
    dispatch,
    sendLaser,
    sendScroll,
    endLesson,
    clock,
    projectorConnected,
  } = useLessonSession(deck, periods, initialFrameId);
  const quiz = useFrameQuiz(courseId, deck, session, dispatch);
  const { tool, setTool, overview, setOverview, menu, setMenu, onKey } =
    useTeacherControls(dispatch, quiz.onStep);
  const [notesForced, setNotesForced] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const navigate = useNavigate();
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
  const actions = useSlideActions(deck, courseId, slide, sheetOpen, dispatch);
  const scrollSync = useMemo(() => ({ report: sendScroll }), [sendScroll]);
  const target = targetStore(courseId);

  if (!session || !entry || !slide) {
    return <div className="lt" />;
  }
  const id = entryId(entry);
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const next = order[index + 1];
  const previous = order[index - 1];
  const number = entry.kind === "slide" ? String(slide.number) : entry.label;
  const monitoring =
    entry.kind === "slide" && slide.worksheet ? (
      <WorksheetMonitoring sheet={slide.worksheet} unlocked={sheetOpen} />
    ) : undefined;
  const inkSlide = !monitoring && slide.kind !== "quiz";
  const openProjector = () => {
    setMenu(false);
    void openProjectorWindow(projectorPath);
  };

  return (
    <div className="lt">
      <LessonHeader
        title={deck.title}
        position={positionText(deck, entry)}
        seconds={clock.seconds}
        deviation={deviation(deck, slide, session.enteredAt, clock.seconds)}
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
        chapterPath={chapterPath}
      />
      <SlideNotes
        entry={entry}
        next={next}
        visible={projectorConnected || notesForced}
        onShowAnyway={() => setNotesForced(true)}
        dispatch={dispatch}
        quiz={quiz.actions}
        actions={actions}
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
        closeLabel="Schließen"
        title="Unterrichtsmodus beenden"
        actions={
          <>
            <Button role="secondary" onClick={() => setEndConfirm(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                target.set(null);
                void quiz.endActive();
                endLesson();
                void navigate(chapterPath);
              }}
            >
              Unterrichtsmodus beenden
            </Button>
          </>
        }
      >
        <p>
          Freigeschaltete Inhalte bleiben verfügbar. Schüler:innen werden danach
          nicht mehr weitergeleitet.
        </p>
      </Dialog>
    </div>
  );
}
