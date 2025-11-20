import { z } from "zod";

export const TopicPlanSchema = z.object({
  title: z.string(),
  chapters: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      goals: z.array(z.string()),
    }).strict()
  ),
}).strict();

export type TopicPlan = z.infer<typeof TopicPlanSchema>;