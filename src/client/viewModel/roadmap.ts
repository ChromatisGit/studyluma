import type { WorksheetRef as WorksheetCardRef } from "@features/worksheet/worksheetModel";

export type Status = "finished" | "current" | "planned" | "locked";

export type RoadmapWorksheetViewModel = {
  id: string;
  title: string;
  slug: string;
  link: string;
  isCompleted: boolean;
  isCurrent: boolean;
};

export type RoadmapChapterViewModel = {
  id: string;
  title: string;
  slug: string;
  label: string;
  link: string;
  status: Status;
  worksheets: RoadmapWorksheetViewModel[];
  isExpanded?: boolean;
};

export type RoadmapTopicViewModel = {
  id: string;
  title: string;
  slug: string;
  label: string;
  link?: string;
  status: Status;
  chapters: RoadmapChapterViewModel[];
  isExpanded?: boolean;
};

export type RoadmapViewModel = RoadmapTopicViewModel[];

export type CoursepageModel = {
  title: string;
  label: string;
  slug: string;
  group: string;
  current?: string | null;
  worksheets?: WorksheetCardRef[];
  roadmap: RoadmapViewModel;
};
