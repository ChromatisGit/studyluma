import { getSummary } from "../../courses";
import { getLesson, type Lesson, type LessonFrame } from "../../lessons";
import { getWorksheetChapter } from "../../worksheets";
import type { Unterrichtsverlauf } from "../infrastructure/flowStore";

/** Adapt a saved sequence to the existing frame workspace and projector. */
// Each step contributes one resource group to the existing lesson workspace.
// eslint-disable-next-line max-lines-per-function
export function flowLesson(flow: Unterrichtsverlauf): Lesson {
  const source = getLesson(flow.chapterId);
  const worksheets = getWorksheetChapter(flow.chapterId, "teacher");
  const frames: LessonFrame[] = [];
  const lessons: Lesson["lessons"] = [];
  flow.steps.forEach((step, index) => {
    const number = index + 1;
    if (step.type === "frame") {
      const part = source?.lessons.find(
        (item) => String(item.number) === step.ref,
      );
      const used =
        source?.frames.filter((item) => item.lesson === part?.number) ?? [];
      lessons.push({ number, title: part?.title ?? "Lesson Frame fehlt" });
      if (!used.length) {
        frames.push({
          id: step.id,
          lesson: number,
          number: "1",
          title: "Lesson Frame fehlt",
          blocks: [],
        });
      }
      used.forEach((frame, slide) =>
        frames.push({
          ...frame,
          id: `${step.id}:${frame.id}`,
          lesson: number,
          number: String(slide + 1),
        }),
      );
    } else if (step.type === "quiz") {
      const original = source?.frames.find((item) => item.id === step.ref);
      lessons.push({ number, title: original?.title ?? "Quiz fehlt" });
      frames.push(
        original
          ? {
              ...original,
              id: original.id,
              lesson: number,
              number: "1",
            }
          : {
              id: step.id,
              lesson: number,
              number: "1",
              title: "Quiz fehlt",
              family: "quiz",
              blocks: [],
            },
      );
    } else if (step.type === "sheet") {
      const sheet = worksheets?.sheets.find((item) => item.id === step.ref);
      lessons.push({ number, title: sheet?.title ?? "Arbeitsblatt fehlt" });
      frames.push({
        id: step.id,
        lesson: number,
        number: "1",
        title: "Arbeitsphase",
        family: "uebung",
        blocks: sheet
          ? [
              {
                type: "sheet",
                sheetId: sheet.id,
                title: `${sheet.number}) ${sheet.title}`,
              },
            ]
          : [],
      });
    } else {
      lessons.push({ number, title: "Zusammenfassung" });
      frames.push({
        id: step.id,
        lesson: number,
        number: "1",
        title: "Zusammenfassung",
        family: "sicherung",
        blocks: [
          {
            type: "markdown",
            markdown: getSummary(flow.chapterId) ?? "Zusammenfassung fehlt",
          },
        ],
      });
    }
  });
  const usedParts = new Set(
    flow.steps.filter((step) => step.type === "frame").map((step) => step.ref),
  );
  source?.lessons
    .filter((part) => !usedParts.has(String(part.number)))
    .forEach((part, index) => {
      const number = flow.steps.length + index + 1;
      lessons.push({ number, title: part.title });
      source.frames
        .filter((frame) => frame.lesson === part.number)
        .forEach((frame, slide) => {
          frames.push({
            ...frame,
            id: `detour:${frame.id}`,
            lesson: number,
            number: String(slide + 1),
          });
        });
    });
  return { chapterId: flow.chapterId, title: flow.name, lessons, frames };
}
