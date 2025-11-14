import type { CoursePlan } from "@schema/course-plan"

export type Topic = CoursePlan["topics"][number];

export type OverviewModel = {
  title: string;
  label: string;
  group: string;
  subject: CoursePlan["subject"];
  finished: Topic[];
  inProgress?: Topic;
  planned: Topic[];
  worksheets: CoursePlan["current_worksheets"];
}