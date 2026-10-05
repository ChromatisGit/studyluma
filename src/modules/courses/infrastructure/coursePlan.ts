import type { Chapter, Course, Topic } from "../domain/course";
import { getCourse } from "./courseRepository";

const COOKIE = "studyluma-course-plan";
const ONE_YEAR = 60 * 60 * 24 * 365;

type AddedTopic = Pick<Topic, "id" | "title" | "icon"> & { phaseId: string };
type AddedChapter = Pick<Chapter, "id" | "title"> & { topicId: string };

export type CoursePlan = {
  courseId: string;
  currentChapterId?: string | null;
  topics: AddedTopic[];
  chapters: AddedChapter[];
  topicOrder?: string[];
  chapterOrder?: Record<string, string[]>;
  names?: Record<string, string>;
  removed?: string[];
};

function emptyPlan(courseId: string): CoursePlan {
  return { courseId, topics: [], chapters: [] };
}

export function readCoursePlan(request: Request, courseId: string): CoursePlan {
  const pair = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!pair) {
    return emptyPlan(courseId);
  }
  try {
    const plans = JSON.parse(
      Buffer.from(pair.slice(COOKIE.length + 1), "base64url").toString("utf8"),
    ) as Record<string, CoursePlan>;
    const plan = plans[courseId];
    return plan?.courseId === courseId ? plan : emptyPlan(courseId);
  } catch {
    return emptyPlan(courseId);
  }
}

export function coursePlanCookie(request: Request, plan: CoursePlan): string {
  let plans: Record<string, CoursePlan> = {};
  const pair = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (pair) {
    try {
      plans = JSON.parse(
        Buffer.from(pair.slice(COOKIE.length + 1), "base64url").toString(
          "utf8",
        ),
      ) as Record<string, CoursePlan>;
    } catch {
      // Replace an invalid cookie with the new plan.
    }
  }
  plans[plan.courseId] = plan;
  const value = Buffer.from(JSON.stringify(plans)).toString("base64url");
  return `${COOKIE}=${value}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}

function orderByIds<T extends { id: string }>(items: T[], ids?: string[]): T[] {
  if (!ids) {
    return items;
  }
  const order = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort(
    (a, b) =>
      (order.get(a.id) ?? items.length) - (order.get(b.id) ?? items.length),
  );
}

function letter(index: number): string {
  return String.fromCharCode(97 + index);
}

export function applyCoursePlan(course: Course, plan: CoursePlan): Course {
  const removed = new Set(plan.removed ?? []);
  const names = plan.names ?? {};
  const topics = course.topics
    .map((topic) => ({
      ...topic,
      title: names[topic.id] ?? topic.title,
      chapters: topic.chapters
        .filter((chapter) => !removed.has(chapter.id))
        .map((chapter) => ({
          ...chapter,
          title: names[chapter.id] ?? chapter.title,
        })),
    }))
    .filter((topic) => !removed.has(topic.id));
  for (const added of plan.topics) {
    if (!removed.has(added.id)) {
      topics.push({ ...added, number: "", chapters: [] });
    }
  }
  for (const chapter of plan.chapters) {
    if (removed.has(chapter.id)) {
      continue;
    }
    const topic = topics.find((item) => item.id === chapter.topicId);
    topic?.chapters.push({ id: chapter.id, title: chapter.title, number: "" });
  }
  const ordered = orderByIds(topics, plan.topicOrder);
  let lastTopicNumber = "0";
  let addedTopicCount = 0;
  for (const topic of ordered) {
    const isAdded = plan.topics.some((item) => item.id === topic.id);
    if (isAdded) {
      topic.number = `${lastTopicNumber}${letter(addedTopicCount++)}`;
    } else {
      lastTopicNumber = topic.number;
      addedTopicCount = 0;
    }
    topic.chapters = orderByIds(topic.chapters, plan.chapterOrder?.[topic.id]);
    let lastChapterNumber = `${topic.number}.0`;
    let addedChapterCount = 0;
    topic.chapters.forEach((chapter, index) => {
      if (plan.chapters.some((item) => item.id === chapter.id)) {
        chapter.number = isAdded
          ? `${topic.number}.${index + 1}`
          : `${lastChapterNumber}${letter(addedChapterCount++)}`;
      } else {
        lastChapterNumber = chapter.number;
        addedChapterCount = 0;
      }
    });
  }
  const phases = course.phases.map((phase) => ({
    ...phase,
    topicIds: [...phase.topicIds],
  }));
  for (const added of plan.topics) {
    const phase = phases.find((item) => item.id === added.phaseId);
    phase?.topicIds.push(added.id);
  }
  return {
    ...course,
    currentChapterId:
      plan.currentChapterId === undefined
        ? course.currentChapterId
        : plan.currentChapterId,
    topics: ordered,
    phases,
  };
}

export function getConfiguredCourse(
  courseId: string,
  request: Request,
): Course | undefined {
  const course = getCourse(courseId);
  return course && applyCoursePlan(course, readCoursePlan(request, courseId));
}

export function updateCoursePlan(
  course: Course,
  plan: CoursePlan,
  form: FormData,
): CoursePlan {
  const next: CoursePlan = structuredClone(plan);
  const action = form.get("intent");
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const current = applyCoursePlan(course, plan);
  const topic = current.topics.find((item) => item.id === id);
  const chapter = current.topics
    .flatMap((item) => item.chapters)
    .find((item) => item.id === id);
  if (action === "current" && chapter) {
    next.currentChapterId = id;
  }
  if (action === "add-topic" && title) {
    const phaseId = String(form.get("phaseId") ?? "");
    if (!course.phases.some((phase) => phase.id === phaseId)) {
      return plan;
    }
    const newId = `custom-topic-${crypto.randomUUID()}`;
    next.topics.push({ id: newId, title, icon: "klausur", phaseId });
    next.topicOrder = [...current.topics.map((item) => item.id), newId];
  }
  if (action === "add-chapter" && title && topic) {
    const newId = `custom-chapter-${crypto.randomUUID()}`;
    next.chapters.push({ id: newId, title, topicId: id });
    next.chapterOrder = {
      ...next.chapterOrder,
      [id]: [...topic.chapters.map((item) => item.id), newId],
    };
  }
  if (action === "rename" && title && (topic || chapter)) {
    if (next.topics.some((item) => item.id === id)) {
      next.topics = next.topics.map((item) =>
        item.id === id ? { ...item, title } : item,
      );
    } else if (next.chapters.some((item) => item.id === id)) {
      next.chapters = next.chapters.map((item) =>
        item.id === id ? { ...item, title } : item,
      );
    } else {
      next.names = { ...next.names, [id]: title };
    }
  }
  if (action === "remove" && id !== current.currentChapterId) {
    if (topic?.chapters.some((item) => item.id === current.currentChapterId)) {
      return plan;
    }
    if (topic || chapter) {
      next.removed = [...(next.removed ?? []), id];
    }
  }
  if ((action === "up" || action === "down") && chapter) {
    const parent = current.topics.find((item) =>
      item.chapters.some((item) => item.id === id),
    );
    if (parent) {
      const ids = parent.chapters.map((item) => item.id);
      const index = ids.indexOf(id);
      const other = index + (action === "up" ? -1 : 1);
      const moved = ids[index];
      const displaced = ids[other];
      if (moved && displaced) {
        ids[index] = displaced;
        ids[other] = moved;
        next.chapterOrder = { ...next.chapterOrder, [parent.id]: ids };
      }
    }
  }
  return next;
}
