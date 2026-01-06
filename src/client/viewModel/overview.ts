import type { WorksheetFormat } from "../schema/course";
import type { ChapterId, CourseId, SubjectKey, GroupKey, TopicId, WorksheetId } from "../schema/ids";

export type CourseOverviewWorksheet = {
  id: WorksheetId;
  title: string;
  worksheetFormat: WorksheetFormat;
};

export type CourseOverviewChapter = {
  id: ChapterId;
  title: string;
  worksheets: CourseOverviewWorksheet[];
};

export type CourseOverviewTopic = {
  id: TopicId;
  title: string;
  chapters: CourseOverviewChapter[];
};

export type CourseOverview = {
  courseId: CourseId;
  groupKey: GroupKey;
  subjectKey: SubjectKey;
  slug: string;
  title: string;
  topics: CourseOverviewTopic[];
};
