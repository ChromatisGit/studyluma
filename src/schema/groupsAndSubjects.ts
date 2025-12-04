import { z } from "zod";
import { accentColorSchema } from "@schema/colors";

export const groupsAndSubjectsSchema = z.object({
    groups: z.record(
        z.string(),
        z.object({
            name: z.string(),
            color: accentColorSchema,
        })
    ),
    subjects: z.record(
        z.string(),
        z.object({
            name: z.string(),
            icon: z.string(),
        })
    ),
    variants: z.record(
        z.string(),
        z.object({
            name: z.string(),
            short: z.string(),
        })
    ),
    schoolyear_start: z.enum(["jan", "feb", "apr", "aug", "sep"])
});

export type GroupsAndSubjects = z.infer<typeof groupsAndSubjectsSchema>;
