import { z } from "zod";

const Subject = z.enum(["math", "info"]);
const Group = z.string().regex(/^[a-z0-9]+$/i, "use letters/numbers only");

const TopicValue = z.array(z.string()).nullable();
const Topics = z.record(z.string(), TopicValue);

export const YamlCoursePlanSchema = z.object({
  course: z.object({
    group: Group,
    subject: Subject,
    label: z.string(),
    variant: z.string().optional(),
  }).strict(),
  current_topic: z.string(),
  current_worksheets: z.array(z.string()).nullable(),
  topics: Topics,
}).strict();

export type YamlCoursePlan = z.infer<typeof YamlCoursePlanSchema>;

export const CoursePlanSchema = YamlCoursePlanSchema.transform(v => ({
  group: v.course.group,
  subject: v.course.subject,
  label: v.course.label,
  course_variant: v.course.variant
    ? `${v.course.subject}-${v.course.variant}`
    : v.course.subject,
  current_topic: v.current_topic,
  current_worksheets: v.current_worksheets ?? [],
  topics: Object.fromEntries(
    Object.entries(v.topics).map(([k, val]) => [k, val ?? []])
  ),
}));

export type CoursePlan = z.infer<typeof CoursePlanSchema>;