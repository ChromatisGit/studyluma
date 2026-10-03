import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

/** The stage: the frame with ink, the arrows, the blanked note, the overview. */
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
}) {
  const id = entryId(entry);
  const frame = entry.kind === "frame" ? entry.frame : entry.parent;
  const strokes = session.ink.filter((stroke) => stroke.frameId === id);
  const order = runningOrder(lesson, session.blanks);
  return (
    <FrameStage className="lt-stage">
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
}: {
  entry: OrderEntry;
  next: OrderEntry | undefined;
  session: LessonSession;
  visible: boolean;
  onShowAnyway: () => void;
  dispatch: ReturnType<typeof useLessonSession>["dispatch"];
  quiz: QuizActionsProps | undefined;
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
      notes={entry.kind === "frame" ? frame.notes : undefined}
      visible={visible}
      onShowAnyway={onShowAnyway}
      next={nextTitle ? { title: nextTitle } : undefined}
      onNext={() => dispatch({ type: "step", by: 1 })}
      back={entry.kind === "blank" ? { number: frame.number } : undefined}
      onBack={() => dispatch({ type: "go", frameId: frame.id })}
      sheet={sheet ? { sent: session.sent.includes(frame.id) } : undefined}
      onSend={() => dispatch({ type: "send", frameId: frame.id })}
      quiz={quiz}
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
}

/**
 * The lesson workspace: a compact head, the notes strip, the 16:9 stage
 * as large as possible and a narrow toolbar. No footer.
 */
export function TeacherView({
  courseId,
  lesson,
  periods,
  projectorPath,
  chapterPath,
}: TeacherViewProps) {
  useTafelTheme();
  const { session, dispatch, sendLaser, endLesson, clock, projectorConnected } =
    useLessonSession(lesson, periods);
  const quiz = useFrameQuiz(courseId, lesson, session, dispatch);
  const { onStep } = quiz;
  const { tool, setTool, overview, setOverview, menu, setMenu, onKey } =
    useTeacherControls(dispatch, onStep);
  const [notesForced, setNotesForced] = useState(false);

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
  const number = entry.kind === "frame" ? frame.number : entry.label;
  const openProjector = () => {
    setMenu(false);
    void openProjectorWindow(projectorPath);
  };

  return (
    <div className="lt">
      <LessonHeader
        title={lesson.title}
        position={positionText(lesson, entry)}
        seconds={clock.seconds}
        deviation={deviation(lesson, frame, session.enteredAt, clock.seconds)}
        projector={{
          connected: projectorConnected,
          hidden: session.hidden,
          number,
        }}
        onToggleHidden={() => dispatch({ type: "toggleHidden" })}
        onOpenProjector={openProjector}
        overviewOpen={overview}
        onToggleOverview={() => setOverview(!overview)}
        menuOpen={menu}
        onToggleMenu={() => setMenu(!menu)}
        period={clock.period}
        onEnd={() => {
          setMenu(false);
          if (window.confirm(TEXT.menu.endConfirm)) {
            endLesson();
          }
        }}
        chapterPath={chapterPath}
      />
      <FrameNotes
        entry={entry}
        next={next}
        session={session}
        visible={projectorConnected || notesForced}
        onShowAnyway={() => setNotesForced(true)}
        dispatch={dispatch}
        quiz={quiz.actions}
      />
      <main className="lt-main">
        <LiveQuizContext.Provider value={quiz.live}>
          <TeacherStage
            lesson={lesson}
            session={session}
            entry={entry}
            tool={tool}
            hasPrevious={index > 0}
            hasNext={!!next}
            overview={overview}
            onCloseOverview={() => setOverview(false)}
            dispatch={dispatch}
            onStep={onStep}
            sendLaser={sendLaser}
          />
        </LiveQuizContext.Provider>
        <Toolbar
          tool={tool}
          onTool={setTool}
          onUndo={() => dispatch({ type: "undo" })}
          undoRemovesBlank={entry.kind === "blank" && strokes.length === 0}
          onBlank={() => onKey("blank")}
        />
      </main>
    </div>
  );
}
