import type { CoursePlan } from "./coursePlan"

export type Status = "finished" | "current" | "planned" | "locked";

export type RoadmapChapter = {
  label: string;
  link: string;
  status: Status;
};

export type RoadmapTopic = {
  label: string;
  status: Status;
  link?: string;
  chapters: RoadmapChapter[];
};

export type OverviewModel = {
  title: string;
  label: string;
  group: string;
  subject: CoursePlan["subject"];
  current: string | null;
  roadmap: RoadmapTopic[];
  worksheets: CoursePlan["current_worksheets"];
};