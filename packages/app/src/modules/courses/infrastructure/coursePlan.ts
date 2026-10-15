import type { Chapter, Course, Topic } from "../domain/course";

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

function encode(value: unknown): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(JSON.stringify(value))) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decode(value: string): unknown {
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
  return JSON.parse(
    new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))),
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const isStringMap = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((v) => typeof v === "string");

function isTopic(value: unknown): value is AddedTopic {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.phaseId === "string" &&
    isRecord(value.icon)
  );
}

function isChapter(value: unknown): value is AddedChapter {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.topicId === "string"
  );
}

/** The plan a cookie holds for this course, or null: the cookie is the browser's, so nothing in it is trusted. */
function validPlan(value: unknown, courseId: string): CoursePlan | null {
  if (
    !isRecord(value) ||
    value.courseId !== courseId ||
    !Array.isArray(value.topics) ||
    !value.topics.every(isTopic) ||
    !Array.isArray(value.chapters) ||
    !value.chapters.every(isChapter) ||
    (value.currentChapterId !== undefined &&
      value.currentChapterId !== null &&
      typeof value.currentChapterId !== "string") ||
    (value.topicOrder !== undefined && !isStrings(value.topicOrder)) ||
    (value.removed !== undefined && !isStrings(value.removed)) ||
    (value.names !== undefined && !isStringMap(value.names)) ||
    (value.chapterOrder !== undefined &&
      !(
        isRecord(value.chapterOrder) &&
        Object.values(value.chapterOrder).every(isStrings)
      ))
  ) {
    return null;
  }
  return value as CoursePlan;
}

/** All plans of the cookie by course id; unusable plans are dropped. */
function readPlans(request: Request): Record<string, CoursePlan> {
  const pair = (request.headers.get("Cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  if (!pair) {
    return {};
  }
  try {
    const raw = decode(pair.slice(COOKIE.length + 1));
    if (!isRecord(raw)) {
      return {};
    }
    const plans: Record<string, CoursePlan> = {};
    for (const [courseId, plan] of Object.entries(raw)) {
      const valid = validPlan(plan, courseId);
      if (valid) {
        plans[courseId] = valid;
      }
    }
    return plans;
  } catch {
    return {};
  }
}

export function readCoursePlan(request: Request, courseId: string): CoursePlan {
  return readPlans(request)[courseId] ?? emptyPlan(courseId);
}

export function coursePlanCookie(request: Request, plan: CoursePlan): string {
  const plans = { ...readPlans(request), [plan.courseId]: plan };
  return `${COOKIE}=${encode(plans)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
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
    topic?.chapters.push({
      id: chapter.id,
      slug: chapter.id,
      title: chapter.title,
      number: "",
    });
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

/** The course as the teacher arranged it in this browser. */
export function getConfiguredCourse(
  courses: Course[],
  courseId: string,
  request: Request,
): Course | undefined {
  const course = courses.find((item) => item.id === courseId);
  return course && applyCoursePlan(course, readCoursePlan(request, courseId));
}

// The form intents share one pure plan transition.
// eslint-disable-next-line max-lines-per-function
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
    const afterTopicId = String(form.get("afterTopicId") ?? "");
    const afterIndex = current.topics.findIndex(
      (item) => item.id === afterTopicId,
    );
    const phaseId =
      current.phases.find((phase) => phase.topicIds.includes(afterTopicId))
        ?.id ??
      current.phases[0]?.id ??
      "";
    const firstChapter = String(form.get("firstChapter") ?? "").trim();
    if (!firstChapter) {
      return plan;
    }
    const newId = `custom-topic-${crypto.randomUUID()}`;
    const chapterId = `custom-chapter-${crypto.randomUUID()}`;
    next.topics.push({
      id: newId,
      title,
      icon: { gallery: String(form.get("icon") ?? "kurve") },
      phaseId,
    });
    next.chapters.push({ id: chapterId, title: firstChapter, topicId: newId });
    const ids = current.topics.map((item) => item.id);
    ids.splice(afterIndex + 1, 0, newId);
    next.topicOrder = ids;
    next.chapterOrder = { ...next.chapterOrder, [newId]: [chapterId] };
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
    }
  }
  if (action === "remove" && id !== current.currentChapterId) {
    if (topic?.chapters.some((item) => item.id === current.currentChapterId)) {
      return plan;
    }
    if (
      next.topics.some((item) => item.id === id) ||
      next.chapters.some((item) => item.id === id)
    ) {
      next.removed = [...new Set([...(next.removed ?? []), id])];
    }
  }
  if (
    (action === "up" || action === "down") &&
    chapter &&
    next.chapters.some((item) => item.id === id)
  ) {
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
  if (
    action === "move" &&
    chapter &&
    next.chapters.some((item) => item.id === id)
  ) {
    const targetId = String(form.get("targetId") ?? "");
    const destination = current.topics.find(
      (item) =>
        item.id === targetId ||
        item.chapters.some((part) => part.id === targetId),
    );
    const source = current.topics.find((item) =>
      item.chapters.some((part) => part.id === id),
    );
    if (destination && source && id !== targetId) {
      const fromIds = source.chapters
        .map((item) => item.id)
        .filter((item) => item !== id);
      const toIds =
        destination.id === source.id
          ? fromIds
          : destination.chapters.map((item) => item.id);
      const at =
        destination.id === targetId
          ? form.get("position") === "end"
            ? toIds.length
            : 0
          : toIds.indexOf(targetId);
      toIds.splice(at, 0, id);
      next.chapterOrder = {
        ...next.chapterOrder,
        [source.id]: fromIds,
        [destination.id]: toIds,
      };
      next.chapters = next.chapters.map((item) =>
        item.id === id ? { ...item, topicId: destination.id } : item,
      );
    }
  }
  return next;
}
