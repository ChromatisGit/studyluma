import { z } from "zod";
import { worksheetFormatEnum } from "@schema/course";

const re = {
  fileName: /^[a-z0-9-]+$/,
  alphaKey: /^[a-z]+$/,
  subjectKey: /^[a-z-]+$/,
  startsWithDigits: /^[0-9]+/,
} as const;

const fileName = z.string().regex(re.fileName, "only lowercase letters a-z, numbers 0-9 and -");
const alphaKey = z.string().regex(re.alphaKey, "only lowercase letters a-z");

const subjectKey = z
  .string()
  .refine((v) => !re.startsWithDigits.test(v), {
    message:
      "Remove the starting numbers from this key. Topic and chapter IDs must be written without the leading numbers.",
  })
  .regex(re.subjectKey, "Invalid key format. Use lowercase letters and '-' only.");

const yearSchema = z.coerce.number().int().positive().optional();

const TopicValueSchema = z.array(subjectKey).nullable();
const TopicsSchema = z.record(subjectKey, TopicValueSchema);

const WorksheetFormatSchema = z.enum(worksheetFormatEnum);

export const yamlCoursePlanSchema = z
  .object({
    course: z
      .object({
        group: alphaKey,
        year: yearSchema,
        subject: alphaKey,
        variant: alphaKey.optional(),
        icon: z.string().optional(),
      })
      .strict(),
    worksheetFormat: WorksheetFormatSchema,
    principlesFile: fileName.optional(),
    isListed: z.boolean().default(true),
    isPublic: z.boolean().default(false),
    topics: TopicsSchema,
  })
  .strict();

export type YamlCoursePlan = z.infer<typeof yamlCoursePlanSchema>;
