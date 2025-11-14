import type { CoursePlan } from "@schema/course-plan"
import path from "node:path";
import { renderOverview } from "../template/overview.mdx";
import type { OverviewModel } from "../types/overview";

export function buildOverview(course: CoursePlan) {
  const relativePath = path.join("courses", course.group, course.course_variant);

  const model = toOverviewModel(course);
  const content = renderOverview(model);

  return { relativePath, pageName: "index.mdx", content };
}

function toOverviewModel(course: CoursePlan): OverviewModel {
  const { group, subject, label, topics, current_worksheets, current_chapter } =
    course;

  const title = `${subjects[subject]} ${group.toUpperCase()}`;

  const hasCurrent = current_chapter !== null;
  const index = hasCurrent ? topics.findIndex((t) => t.chapter === current_chapter) : 0;
  if (index === -1) {
    throw new Error(
      `Invalid current_chapter "${current_chapter}" in course ${group}/${subject}.`
    );
  }

  const finished = hasCurrent ? topics.slice(0, index) : [];
  const inProgress = hasCurrent ? topics[index] : undefined;
  const planned = hasCurrent ? topics.slice(index + 1) : topics;

  return {
    title,
    label,
    group,
    subject,
    finished,
    inProgress,
    planned,
    worksheets: current_worksheets,
  };
}

const subjects = {
  math: 'Mathe',
  info: 'Informatik'
}