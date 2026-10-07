/* eslint-disable max-lines */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Dialog } from "@chromatis/base/ui";
import { useNavigate } from "react-router";
import { fill } from "../../../helper/text";
import { useLessonSession } from "../application/useLessonSession";
import { deviation, type Period } from "../domain/clock";
import { entryId, runningOrder, type OrderEntry } from "../domain/layout";
import type { Lesson, LessonSession } from "../domain/lesson";
import { openProjectorWindow } from "../infrastructure/projectorChannel";
import { FrameStage } from "./FrameStage";
import { FrameView } from "./FrameView";
import { InkInput, InkStrokes, type InkTool } from "./InkLayer";
import { LessonHeader } from "./LessonHeader";
import { NotesStrip } from "./NotesStrip";
import { Overview } from "./Overview";
import { LiveQuizContext } from "./FrameQuiz";
import type { QuizActionsProps } from "./QuizActions";
import { Toolbar } from "./Toolbar";
import { WorksheetMonitoring } from "./WorksheetMonitoring";
import { useFrameQuiz } from "./useFrameQuiz";
import { useTeacherKeys, type TeacherKey } from "./useTeacherKeys";
import TEXT from "./lessons.de.json";
import {
  summaryStore,
  targetStore,
  type Unterrichtsverlauf,
} from "../../teaching";
import {
  chapterStore,
  getWorksheetChapter,
  isUnlocked,
  type Sheet,
} from "../../worksheets";
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

/** The stage: the frame with ink, the arrows, the blanked note, the overview. */
// Stage overlays share navigation and ink state.
// eslint-disable-next-line max-lines-per-function
function TeacherStage({
  lesson,
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
  monitoringSheet,
  monitoringUnlocked,
  flow,
  onOverviewGo,
}: {
  lesson: Lesson;
  session: LessonSession;
  entry: OrderEntry;
  tool: InkTool;
  hasPrevious: boolean;
  hasNext: boolean;
  overview: boolean;
  onCloseOverview: () => void;
  dispatch: ReturnType<typeof useLessonSession>["dispatch"];
  onStep: (by: 1 | -1) => void;
  sendLaser: (point: [number, number] | null) => void;
  monitoringSheet?: Sheet | undefined;
  monitoringUnlocked?: boolean | undefined;
  flow?: Unterrichtsverlauf | undefined;
  onOverviewGo: (id: string) => void;
}) {
  const id = entryId(entry);
  const frame = entry.kind === "frame" ? entry.frame : entry.parent;
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const order = runningOrder(lesson, session.blanks);
  return (
    <FrameStage className="lt-stage">
      {monitoringSheet ? (
        <WorksheetMonitoring
          sheet={monitoringSheet}
          unlocked={!!monitoringUnlocked}
        />
      ) : (
        <FrameView
          entry={entry}
          lessonTitle={lesson.title}
          sent={session.sent.includes(frame.id)}
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
          lesson={lesson}
          order={order}
          currentId={id}
          ink={session.ink}
          sent={session.sent}
          flow={flow}
          onGo={(target) => {
            onOverviewGo(target);
            onCloseOverview();
          }}
          onClose={onCloseOverview}
        />
      )}
    </FrameStage>
  );
}

/** Tool, overview and menu state, and what each key does. */
function useTeacherControls(
  dispatch: ReturnType<typeof useLessonSession>["dispatch"],
  onStep: (by: 1 | -1) => void,
) {
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

/** The notes strip for the current frame or blank surface. */
function FrameNotes({
  entry,
  next,
  session,
  visible,
  onShowAnyway,
  dispatch,
  quiz,
  actions,
  flowStep,
  onNext,
}: {
  entry: OrderEntry;
  next: OrderEntry | undefined;
  session: LessonSession;
  visible: boolean;
  onShowAnyway: () => void;
  dispatch: ReturnType<typeof useLessonSession>["dispatch"];
  quiz: QuizActionsProps | undefined;
  actions?: React.ReactNode;
  flowStep?: number | undefined;
  onNext: () => void;
}) {
  const frame = entry.kind === "frame" ? entry.frame : entry.parent;
  const number = entry.kind === "frame" ? frame.number : entry.label;
  const nextTitle = next
    ? next.kind === "frame"
      ? next.frame.title
      : TEXT.frame.blank
    : undefined;
  const sheet = frame.blocks?.some((block) => block.type === "sheet");
  return (
    <NotesStrip
      number={number}
      heading={
        flowStep
          ? `Schritt ${flowStep} · ${quiz ? "Quiz" : actions ? "Arbeitsphase" : "Lesson Frame"}: ${frame.title}`
          : undefined
      }
      notes={entry.kind === "frame" ? frame.notes : undefined}
      visible={visible}
      onShowAnyway={onShowAnyway}
      next={nextTitle ? { title: nextTitle } : undefined}
      onNext={onNext}
      back={entry.kind === "blank" ? { number: frame.number } : undefined}
      onBack={() => dispatch({ type: "go", frameId: frame.id })}
      sheet={
        sheet && !flowStep
          ? { sent: session.sent.includes(frame.id) }
          : undefined
      }
      onSend={() => dispatch({ type: "send", frameId: frame.id })}
      quiz={quiz}
      actions={actions}
    />
  );
}

/** "Stunde 1, Frame 3 von 12" or "Stunde 1, Abzweig 5a". */
function positionText(lesson: Lesson, entry: OrderEntry): string {
  return entry.kind === "frame"
    ? fill(TEXT.header.position, {
        lesson: entry.frame.lesson,
        number: entry.frame.number,
        total: lesson.frames.length,
      })
    : fill(TEXT.header.branch, {
        lesson: entry.parent.lesson,
        label: entry.label,
      });
}

export interface TeacherViewProps {
  /** The course whose students take part in the quiz. */
  courseId: string;
  lesson: Lesson;
  periods: Period[];
  projectorPath: string;
  chapterPath: string;
  initialFrameId?: string | undefined;
  flow?: Unterrichtsverlauf | undefined;
}

/**
 * The lesson workspace: a compact head, the notes strip, the 16:9 stage
 * as large as possible and a narrow toolbar. No footer.
 */
// The teaching workspace coordinates the existing lesson primitives.
// eslint-disable-next-line max-lines-per-function
export function TeacherView({
  courseId,
  lesson,
  periods,
  projectorPath,
  chapterPath,
  initialFrameId,
  flow,
}: TeacherViewProps) {
  useTafelTheme();
  const { session, dispatch, sendLaser, endLesson, clock, projectorConnected } =
    useLessonSession(lesson, periods, initialFrameId);
  const quiz = useFrameQuiz(courseId, lesson, session, dispatch, !!flow);
  const [detourReturn, setDetourReturn] = useState<string | null>(null);
  const onStep = useCallback(
    (by: 1 | -1) => {
      const currentId = session?.currentFrameId;
      const order = runningOrder(lesson, session?.blanks ?? []);
      const currentIndex = order.findIndex(
        (item) => entryId(item) === currentId,
      );
      const target = order[currentIndex + by];
      const targetLesson =
        target &&
        (target.kind === "frame" ? target.frame : target.parent).lesson;
      const currentLesson =
        order[currentIndex] &&
        (order[currentIndex].kind === "frame"
          ? order[currentIndex].frame
          : order[currentIndex].parent
        ).lesson;
      if (
        flow &&
        targetLesson &&
        (detourReturn
          ? targetLesson !== currentLesson
          : targetLesson > flow.steps.length)
      ) {
        return;
      }
      quiz.onStep(by);
    },
    [session, lesson, flow, detourReturn, quiz],
  );
  const { tool, setTool, overview, setOverview, menu, setMenu, onKey } =
    useTeacherControls(dispatch, onStep);
  const [notesForced, setNotesForced] = useState(false);
  const [endConfirm, setEndConfirm] = useState(false);
  const navigate = useNavigate();
  const accessStore = chapterStore(lesson.chapterId);
  const access = useSyncExternalStore(
    accessStore.subscribe,
    accessStore.getSnapshot,
    accessStore.getServerSnapshot,
  );
  const summaryAccessStore = summaryStore(lesson.chapterId);
  const summaryAccess = useSyncExternalStore(
    summaryAccessStore.subscribe,
    summaryAccessStore.getSnapshot,
    summaryAccessStore.getServerSnapshot,
  );
  const activeTargetStore = targetStore(courseId);
  const activeTarget = useSyncExternalStore(
    activeTargetStore.subscribe,
    activeTargetStore.getSnapshot,
    activeTargetStore.getServerSnapshot,
  );

  if (!session) {
    return <div className="lt" />;
  }
  const order = runningOrder(lesson, session.blanks);
  const index = Math.max(
    0,
    order.findIndex((entry) => entryId(entry) === session.currentFrameId),
  );
  const entry = order[index];
  if (!entry) {
    return <div className="lt" />;
  }
  const frame = entry.kind === "frame" ? entry.frame : entry.parent;
  const id = entryId(entry);
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const next = order[index + 1];
  const previous = order[index - 1];
  const number = entry.kind === "frame" ? frame.number : entry.label;
  const flowStep = flow?.steps[frame.lesson - 1];
  const inDetour = !!flow && frame.lesson > flow.steps.length;
  const sameDetour = (other: OrderEntry | undefined) =>
    !!other &&
    (other.kind === "frame" ? other.frame : other.parent).lesson ===
      frame.lesson;
  const canNext =
    !!next &&
    (!flow ||
      (inDetour
        ? sameDetour(next)
        : (next.kind === "frame" ? next.frame : next.parent).lesson <=
          flow.steps.length));
  const canPrevious = !!previous && (!inDetour || sameDetour(previous));
  const onOverviewGo = (target: string) => {
    if (flow && target.startsWith("detour:")) {
      setDetourReturn((value) => value ?? id);
    } else {
      setDetourReturn(null);
    }
    dispatch({ type: "go", frameId: target });
  };
  const sheet =
    flowStep?.type === "sheet"
      ? getWorksheetChapter(lesson.chapterId, "teacher")?.sheets.find(
          (item) => item.id === flowStep.ref,
        )
      : undefined;
  const sheetOpen = sheet ? isUnlocked(sheet, access) : false;
  const targetHere =
    !!sheet && activeTarget?.kind === "sheet" && activeTarget.id === sheet.id;
  const correct =
    quiz.live?.frameId === id && quiz.live.step !== "revealed"
      ? quiz.live.question.options
          .map((option, index) =>
            option.correct ? `${"ABCDEFGH"[index]} · ${option.label}` : null,
          )
          .filter(Boolean)
          .join(", ")
      : "";
  const flowActions =
    flowStep?.type === "sheet" && sheet ? (
      <>
        {!sheetOpen && (
          <button
            type="button"
            className="lt-btn lt-btn--quiet"
            onClick={() => accessStore.setUnlocked(sheet.id, true)}
          >
            Freischalten
          </button>
        )}
        <button
          type="button"
          className="lt-btn"
          onClick={() => {
            if (!sheetOpen) {
              accessStore.setUnlocked(sheet.id, true);
            }
            activeTargetStore.set(
              targetHere
                ? null
                : { kind: "sheet", id: sheet.id, chapterId: lesson.chapterId },
            );
          }}
        >
          {targetHere
            ? "Nicht mehr schicken"
            : sheetOpen
              ? "Schüler senden"
              : "Freischalten & Schüler senden"}
        </button>
      </>
    ) : inDetour && detourReturn ? (
      <button
        type="button"
        className="lt-btn"
        onClick={() => {
          dispatch({ type: "go", frameId: detourReturn });
          setDetourReturn(null);
        }}
      >
        Zurück zu Schritt{" "}
        {lesson.frames.find((item) => item.id === detourReturn)?.lesson ?? 1}
      </button>
    ) : flowStep?.type === "quiz" && correct ? (
      <span className="lt-notes__sent">Lösung {correct}</span>
    ) : flowStep?.type === "summary" ? (
      <>
        {summaryAccess.unlocked ? (
          <span className="lt-notes__sent">Zusammenfassung freigeschaltet</span>
        ) : (
          <button
            type="button"
            className="lt-btn"
            onClick={() => summaryAccessStore.set({ unlocked: true })}
          >
            Zusammenfassung freischalten
          </button>
        )}
      </>
    ) : undefined;
  const openProjector = () => {
    setMenu(false);
    void openProjectorWindow(projectorPath);
  };

  return (
    <div className="lt">
      <LessonHeader
        title={lesson.title}
        position={
          inDetour
            ? `Außerhalb des Verlaufs · Folie ${frame.number} von ${lesson.frames.filter((item) => item.lesson === frame.lesson).length}`
            : flowStep
              ? `Schritt ${frame.lesson}${flowStep.type === "frame" ? ` · Folie ${frame.number} von ${lesson.frames.filter((item) => item.lesson === frame.lesson).length}` : ""}`
              : positionText(lesson, entry)
        }
        seconds={clock.seconds}
        deviation={deviation(lesson, frame, session.enteredAt, clock.seconds)}
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
      <FrameNotes
        entry={entry}
        next={canNext ? next : undefined}
        session={session}
        visible={projectorConnected || notesForced}
        onShowAnyway={() => setNotesForced(true)}
        dispatch={dispatch}
        quiz={quiz.actions}
        flowStep={flowStep ? frame.lesson : undefined}
        actions={flowActions}
        onNext={() => onStep(1)}
      />
      <main className="lt-main">
        <LiveQuizContext.Provider value={{ view: quiz.live, teacher: true }}>
          <TeacherStage
            lesson={lesson}
            session={session}
            entry={entry}
            tool={
              flowStep?.type === "sheet" || flowStep?.type === "quiz"
                ? "cursor"
                : tool
            }
            monitoringSheet={flowStep?.type === "sheet" ? sheet : undefined}
            monitoringUnlocked={sheetOpen}
            hasPrevious={canPrevious}
            hasNext={canNext}
            overview={overview}
            onCloseOverview={() => setOverview(false)}
            dispatch={dispatch}
            onStep={onStep}
            flow={flow}
            onOverviewGo={onOverviewGo}
            sendLaser={sendLaser}
          />
        </LiveQuizContext.Provider>
        {flowStep?.type !== "sheet" && flowStep?.type !== "quiz" && (
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
                activeTargetStore.set(null);
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
