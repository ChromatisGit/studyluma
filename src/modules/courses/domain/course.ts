import type { TopicIcon } from "../../catalog";

/** A course as the Lernweg shows it: topics with stable numbers. */
export type Course = {
  id: string;
  title: string;
  /** Short line badge, e.g. "MA". */
  badge: string;
  /** Where the class is; set by the teacher. */
  currentChapterId: string | null;
  /** Optional school-year sections. Without phases there are no tabs. */
  phases: CoursePhase[];
  topics: Topic[];
};

export type CoursePhase = { id: string; label: string; topicIds: string[] };

export type Topic = {
  id: string;
  /** Stable number: "9". */
  number: string;
  title: string;
  /** A pictogram from the gallery or the topic folder's icon.svg. */
  icon?: TopicIcon;
  chapters: Chapter[];
};

export type Chapter = {
  id: string;
  /** Stable number: "9.2". */
  number: string;
  title: string;
};

/** A chapter together with its place in the course. */
export type ChapterInCourse = Chapter & {
  topic: Topic;
  /** Position in course order. */
  index: number;
  /** The class has reached this chapter (or the course has no position). */
  reached: boolean;
  current: boolean;
};
