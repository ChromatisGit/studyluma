import type { WorksheetRef } from "@schema/courseContent";

export type CourseId = string;

export type CourseDTO = {
  id: string;
  label: string;
  description: string;
  groupKey: string;
  subjectId: string;
  slug: string;
  icon?: string;
  color: string;
  tags: string[];
};

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

export type SidebarCourseDTO = {
  id: string;
  label: string;
  href: string;
  icon?: string;
};

export type SidebarDTO = ProgressDTO & {
  courses: SidebarCourseDTO[];
  isAuthenticated: boolean;
  primaryGroupKey?: string;
  accessCode?: string;
  /** Display badge emoji for the user (e.g. "🎓"). Stub until DB field exists. */
  badge?: string;
  /** Total XP earned by the user. Stub until DB field exists. */
  xp?: number;
};

export type CourseAccessGroups = {
  public: string[];
  accessible: string[];
  restricted: string[];
  hidden: string[];
};
