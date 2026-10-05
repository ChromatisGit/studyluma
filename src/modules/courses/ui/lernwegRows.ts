import type { StopStatus } from "./Linie";

export type LernwegChapter = {
  id: string;
  number: string;
  title: string;
  to: string;
};
export type LernwegTopic = {
  id: string;
  number: string;
  title: string;
  pictogram?: string | undefined;
  chapters: LernwegChapter[];
};
export type LernwegPhase = {
  id: string;
  label: string;
  topics: LernwegTopic[];
};

export type LernwegRow =
  | {
      kind: "stub";
      key: string;
      direction: "before" | "after";
      phase: LernwegPhase;
    }
  | {
      kind: "topic";
      key: string;
      topic: LernwegTopic;
      status: StopStatus;
      openable: boolean;
      open: boolean;
    }
  | {
      kind: "chapter";
      key: string;
      chapter: LernwegChapter;
      status: StopStatus;
      linked: boolean;
    };

/** Where the class is within the phases. */
export function lernwegPosition(
  phases: LernwegPhase[],
  currentChapterId: string | null,
) {
  const order = phases.flatMap((phase) => phase.topics);
  const currentTopicIndex = order.findIndex((topic) =>
    topic.chapters.some((chapter) => chapter.id === currentChapterId),
  );
  const currentTopic =
    currentTopicIndex >= 0 ? order[currentTopicIndex] : undefined;
  const currentPhaseIndex = currentTopic
    ? phases.findIndex((phase) => phase.topics.includes(currentTopic))
    : phases.length - 1;
  return { order, currentTopicIndex, currentTopic, currentPhaseIndex };
}

function chapterStatus(
  topicStatus: StopStatus,
  chapterIndex: number,
  currentChapter: number,
): StopStatus {
  if (topicStatus === "done" || topicStatus === "ahead") {
    return topicStatus;
  }
  if (chapterIndex < currentChapter) {
    return "done";
  }
  return chapterIndex === currentChapter ? "here" : "ahead";
}

/**
 * The rows of one phase: travelled track is solid, the track ahead pale.
 * Past topics open for review; of the upcoming topics only the next one.
 * `hereIndex` is the row the class is at.
 */
export function lernwegRows(
  phases: LernwegPhase[],
  phaseIndex: number,
  currentChapterId: string | null,
  openTopic: string | null,
): { rows: LernwegRow[]; hereIndex: number } {
  const { order, currentTopicIndex, currentPhaseIndex } = lernwegPosition(
    phases,
    currentChapterId,
  );
  const hasPosition = currentTopicIndex >= 0;
  const rows: LernwegRow[] = [];
  let hereIndex =
    !hasPosition || phaseIndex > currentPhaseIndex
      ? -1
      : phaseIndex < currentPhaseIndex
        ? Number.POSITIVE_INFINITY
        : 0;
  const previous = phases[phaseIndex - 1];
  if (previous) {
    rows.push({
      kind: "stub",
      key: "previous",
      direction: "before",
      phase: previous,
    });
  }
  for (const topic of phases[phaseIndex]?.topics ?? []) {
    const index = order.indexOf(topic);
    const status: StopStatus = !hasPosition
      ? "ahead"
      : index < currentTopicIndex
        ? "done"
        : index === currentTopicIndex
          ? "current"
          : "ahead";
    const openable =
      !hasPosition || status !== "ahead" || index === currentTopicIndex + 1;
    const open = openable && openTopic === topic.id;
    rows.push({ kind: "topic", key: topic.id, topic, status, openable, open });
    if (status === "current" && !open) {
      hereIndex = rows.length - 1;
    }
    if (!open) {
      continue;
    }
    const currentChapter = topic.chapters.findIndex(
      (chapter) => chapter.id === currentChapterId,
    );
    topic.chapters.forEach((chapter, chapterIndex) => {
      const status_ = chapterStatus(status, chapterIndex, currentChapter);
      rows.push({
        kind: "chapter",
        key: chapter.id,
        chapter,
        status: status_,
        linked: !hasPosition || status_ !== "ahead",
      });
      if (status_ === "here") {
        hereIndex = rows.length - 1;
      }
    });
  }
  const next = phases[phaseIndex + 1];
  if (next && phaseIndex < currentPhaseIndex) {
    rows.push({ kind: "stub", key: "next", direction: "after", phase: next });
  }
  return { rows, hereIndex };
}
