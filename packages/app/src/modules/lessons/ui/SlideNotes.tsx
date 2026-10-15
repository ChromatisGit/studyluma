import type { ReactNode } from "react";
import type { useLessonSession } from "../application/useLessonSession";
import { entrySlide, type OrderEntry } from "../domain/layout";
import { NotesStrip } from "./NotesStrip";
import type { QuizActionsProps } from "./QuizActions";
import TEXT from "./lessons.de.json";

type Dispatch = ReturnType<typeof useLessonSession>["dispatch"];

/** The notes strip for the current slide or blank surface. */
export function SlideNotes({
  entry,
  next,
  visible,
  onShowAnyway,
  dispatch,
  quiz,
  actions,
  extra,
  onNext,
}: {
  entry: OrderEntry;
  next: OrderEntry | undefined;
  visible: boolean;
  onShowAnyway: () => void;
  dispatch: Dispatch;
  quiz: QuizActionsProps | undefined;
  actions: ReactNode;
  extra?: ReactNode;
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
      extra={extra}
    />
  );
}
