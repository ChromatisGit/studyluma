import type { WorksheetRef } from "@schema/courseContent";

export type CourseId = string;

export type CourseDTO = {
  id: string;
  label: string;
  description: string;
  groupKey: string;
  subjectId: string;
  slug: string;
  icon?: string | undefined;
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
  icon?: string | undefined;
};

export type SidebarDTO = ProgressDTO & {
  courses: SidebarCourseDTO[];
  isAuthenticated: boolean;
  primaryGroupKey?: string | undefined;
  accessCode?: string | undefined;
  badge?: string | undefined;
  xp?: number | undefined;
};

export type CourseAccessGroups = {
  public: string[];
  accessible: string[];
  restricted: string[];
  hidden: string[];
};
