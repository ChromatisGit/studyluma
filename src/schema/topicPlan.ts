import { z } from "zod";

export const topicPlanSchema = z.object({
  title: z.string(),
  chapters: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      time: z.number().optional(),
      goals: z.array(z.string()),
    }).strict()
  ),
}).strict();

export type TopicPlan = z.infer<typeof topicPlanSchema>;