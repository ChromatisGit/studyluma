import { z } from "zod";
import type { GroupsAndSubjects } from "./groupsAndSubjects";

const Group = z.string().regex(/^[a-z0-9]+$/i, "use letters/numbers only");

const TopicValue = z.array(z.string()).nullable();
const TopicsSchema = z.record(z.string(), TopicValue);

export const yamlCoursePlanSchema = z.object({
  course: z.object({
    group: Group,
    subject: z.string(),
    variant: z.string().optional(),
    icon: z.string().optional(),
  }).strict(),
  worksheet : z.object({
    format: z.enum(["web", "pdf"]),
  }),
  current_chapter: z.string().nullable(),
  topics: TopicsSchema,
}).strict();

export type YamlCoursePlan = z.infer<typeof yamlCoursePlanSchema>;


type Topics = z.infer<typeof TopicsSchema>

function toTopics(topics: Topics) {
  return Object.entries(topics).map(([topic, chapters]) => {
    const chapterList = chapters && chapters.length > 0 ? chapters : [topic];

    return {
      topic,
      label: topic,
      chapters: chapterList.map((chapter) => ({
        topic,
        chapter,
        label: chapter,
      })),
    };
  });
}

export const CoursePlanSchema = yamlCoursePlanSchema.transform(v => ({
  group: v.course.group,
  subject: v.course.subject,
  courseVariant: v.course.variant,
  slug: v.course.variant
    ? `${v.course.subject}-${v.course.variant}`
    : v.course.subject,
  currentChapter: v.current_chapter,
  worksheetFormat: v.worksheet.format,
  topics: toTopics(v.topics),
}))
  .refine(
    ({ topics, currentChapter }) =>
      currentChapter === null ||
      topics.some((topic) =>
        topic.chapters.some((chapter) => chapter.chapter === currentChapter),
      ),
    {
      error: "current_chapter must be null or exist inside of topics!",
    }
  );

export type CoursePlan = z.infer<typeof CoursePlanSchema>;

export function createCoursePlanSchema(groupsAndSubjects: GroupsAndSubjects) {
  return CoursePlanSchema.superRefine((course, ctx) => {
    const groupId = course.group.replace(/[0-9]/g, "");

    if (!groupsAndSubjects.groups[groupId]) {
      ctx.addIssue({
        code: "custom",
        path: ["group"],
        message: `Group '${course.group}' is not defined in groupsAndSubjects.yml`,
      });
    }

    if (!groupsAndSubjects.subjects[course.subject]) {
      ctx.addIssue({
        code: "custom",
        path: ["subject"],
        message: `Subject '${course.subject}' is not defined in groupsAndSubjects.yml`,
      });
    }

    if (course.courseVariant && !groupsAndSubjects.variants[course.courseVariant]) {
      ctx.addIssue({
        code: "custom",
        path: ["courseVariant"],
        message: `Variant '${course.courseVariant}' is not defined in groupsAndSubjects.yml`,
      });
    }
  });
}
