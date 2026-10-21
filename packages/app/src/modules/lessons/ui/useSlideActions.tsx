import { useSubmit } from "react-router";
import {
  localReleases,
  useSentTarget,
  useSheetAccess,
  useSite,
} from "../../classroom";
import type { useLessonSession } from "../application/useLessonSession";
import type { Deck, Slide } from "../domain/deck";
import TEXT from "./lessons.de.json";

type Dispatch = ReturnType<typeof useLessonSession>["dispatch"];

type SlideView = {
  shown: boolean;
  classView: boolean;
  onClassView: (open: boolean) => void;
};

/** Slide or worksheet on the projector, or the class overview for the teacher alone. */
function ViewSwitch({
  slideId,
  view,
  dispatch,
}: {
  slideId: string;
  view: SlideView;
  dispatch: Dispatch;
}) {
  const mode = view.classView ? "class" : view.shown ? "sheet" : "slide";
  const choose = (next: "slide" | "sheet" | "class") => {
    view.onClassView(next === "class");
    if (next !== "class" && (next === "sheet") !== view.shown) {
      dispatch({ type: "toggleSheet", frameId: slideId });
    }
  };
  return (
    <div className="lt-seg" role="group" aria-label={TEXT.teacher.view}>
      {(
        [
          ["slide", TEXT.teacher.viewSlide],
          ["sheet", TEXT.teacher.viewSheet],
          ["class", TEXT.teacher.viewClass],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          className="lt-seg__item"
          aria-pressed={mode === key}
          onClick={() => choose(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** What the notes strip offers on this slide besides the notes. */
export function useSlideActions(
  deck: Deck,
  courseId: string,
  slide: Slide | undefined,
  sheetOpen: boolean,
  dispatch: Dispatch,
  view: SlideView,
) {
  const site = useSite();
  const submit = useSubmit();
  const { active, send } = useSentTarget(courseId);
  const setUnlocked = useSheetAccess(courseId, deck.chapterId);
  const worksheet = slide?.worksheet;
  const targetHere =
    !!worksheet && active?.kind === "sheet" && active.id === worksheet.id;
  const released = site.releasedSummaries.includes(deck.chapterId);
  if (slide && worksheet) {
    return (
      <>
        <ViewSwitch slideId={slide.id} view={view} dispatch={dispatch} />
        {!sheetOpen && (
          <button
            type="button"
            className="lt-btn lt-btn--quiet"
            onClick={() => setUnlocked(worksheet.id, true)}
          >
            Freischalten
          </button>
        )}
        <button
          type="button"
          className="lt-btn"
          onClick={() => {
            if (!sheetOpen) {
              setUnlocked(worksheet.id, true);
            }
            send(
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
            ? TEXT.teacher.stopSending
            : sheetOpen
              ? TEXT.teacher.sendStudents
              : TEXT.teacher.unlockAndSend}
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
          if (site.localReleases) {
            localReleases.setSummary(deck.chapterId, true);
            return;
          }
          const data = new FormData();
          data.set("intent", "releaseSummary");
          data.set("chapterId", deck.chapterId);
          // The overview's action, through the router (pages have no server URL).
          void submit(data, {
            method: "post",
            action: `/courses/${encodeURIComponent(courseId)}/overview`,
            navigate: false,
            fetcherKey: `release-summary:${deck.chapterId}`,
          });
        }}
      >
        {TEXT.teacher.releaseSummary}
      </button>
    );
  }
  return undefined;
}
