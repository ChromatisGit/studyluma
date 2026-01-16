import { z } from "zod";
import { accentColorEnum } from "@schema/accentColors";

const accentColorSchema = z.enum(accentColorEnum)

const idKeySchema = z
  .string()
  .regex(/^[a-z]+$/, "ID must be lowercase letters a-z only");

export const groupDefinitionsSchema = z.object({
  groups: z.record(
    idKeySchema,
    z.object({
      name: z.string().min(1),
      color: accentColorSchema,
    }).strict()
  ),
  subjects: z.record(
    idKeySchema,
    z.object({
      name: z.string().min(1),
      icon: z.string().min(1).optional(),
    }).strict()
  ),
  variants: z.record(
    idKeySchema,
    z.object({
      name: z.string().min(1),
      short: z.string().min(1).max(6),
    }).strict()
  ),
}).strict();

export type GroupDefinitions = z.infer<typeof groupDefinitionsSchema>;
