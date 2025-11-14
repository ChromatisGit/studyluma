import { z } from "zod";

const Subject = z.enum(["math", "info"]);
const Group = z.string().regex(/^[a-z0-9]+$/i, "use letters/numbers only");

const TopicValue = z.array(z.string()).nullable();
const TopicsSchema = z.record(z.string(), TopicValue);

export const YamlCoursePlanSchema = z.object({
  course: z.object({
    group: Group,
    subject: Subject,
    label: z.string(),
    variant: z.string().optional(),
  }).strict(),
  current_chapter: z.string().nullable(),
  current_worksheets: z.array(z.string()).nullable(),
  topics: TopicsSchema,
}).strict();

export type YamlCoursePlan = z.infer<typeof YamlCoursePlanSchema>;


type Topics = z.infer<typeof TopicsSchema>

function flattenTopics(topics: Topics) {
  return Object.entries(topics).flatMap(([topic, chapters]) => {
    if (!chapters) {
      return [{ topic, chapter: topic }]
    }
    return chapters.map(chapter => {
      return { topic, chapter }
    })
  })
}

export const CoursePlanSchema = YamlCoursePlanSchema.transform(v => ({
  group: v.course.group,
  subject: v.course.subject,
  label: v.course.label,
  course_variant: v.course.variant
    ? `${v.course.subject}-${v.course.variant}`
    : v.course.subject,
  current_chapter: v.current_chapter,
  current_worksheets: v.current_worksheets ?? [],
  topics: flattenTopics(v.topics)
}))
  .refine(
  ({ topics, current_chapter }) =>
    current_chapter === null ||
    topics.some(t => t.chapter === current_chapter),
  {
    message: "current_chapter must be null or exist inside of topics!",
    path: ["current_chapter"]
  }
);

export type CoursePlan = z.infer<typeof CoursePlanSchema>;