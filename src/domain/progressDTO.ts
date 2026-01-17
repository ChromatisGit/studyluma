import type { WorksheetRef } from "./courseContent";

export type ProgressStatus = "finished" | "current" | "planned" | "locked";

export type ProgressChapterDTO = {
  chapterId: string;
  label: string;
  href: string;
  status: ProgressStatus;
  worksheets?: WorksheetRef[];
};

export type ProgressTopicDTO = {
  topicId: string;
  label: string;
  href: string;
  status: ProgressStatus;
  chapters: ProgressChapterDTO[];
};

export type ProgressDTO = {
  currentTopicId: string;
  currentChapterId: string;
  topics: ProgressTopicDTO[];
};
