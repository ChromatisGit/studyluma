import { z } from "zod";
import { codedIssue } from "./toml";

/**
 * The TOML files an author writes next to the Markdown: topics, courses, the
 * timetable and the front matter of documents. Each schema defines its
 * fields, their defaults and which keys exist; unknown keys are errors.
 */

const title = z.string().trim().min(1);

/** `<fach>/<thema>/thema.toml` */
export const topicSchema = z
  .object({
    titel: title.describe("Display name of the topic."),
    icon: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        "Name of a pictogram from the icon gallery; a topic with an icon.svg must not set it.",
      ),
  })
  .strict();

/** `kurse/<id>.toml`: the topics of a course and their chapters, in order. */
export const courseSchema = z
  .object({
    titel: title.describe("Display name of the course."),
    themen: z
      .record(z.string(), z.array(z.string().min(1)).min(1))
      .describe(
        "Topic folder name = the chapters of that topic in this course, in order.",
      ),
    aktuell: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'The chapter the course is at, written "topic folder/chapter" like in themen; it must be one of them. Default: the first chapter.',
      ),
  })
  .strict();

const PERIOD = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

/** `definitions.toml`: the bell times as minutes after midnight. */
export const definitionsSchema = z
  .object({
    stundenplan: z
      .array(
        z.string().regex(PERIOD, { message: 'must be written "HH:MM-HH:MM"' }),
      )
      .describe(
        'The lesson periods in order, each written "HH:MM-HH:MM"; they must not overlap.',
      )
      .superRefine((periods, ctx) => {
        let previousEnd = -Infinity;
        periods.forEach((text, index) => {
          const m = PERIOD.exec(text);
          if (!m) return;
          const start = Number(m[1]) * 60 + Number(m[2]);
          const end = Number(m[3]) * 60 + Number(m[4]);
          if (end <= start || start < previousEnd) {
            ctx.addIssue(
              codedIssue(
                "TIMETABLE",
                end <= start
                  ? "must end after it starts"
                  : "must not start before the previous period ends",
                [index],
              ),
            );
          } else {
            previousEnd = end;
          }
        });
      })
      .transform((periods) =>
        periods.map((text, index) => {
          const m = PERIOD.exec(text)!;
          return {
            number: index + 1,
            start: Number(m[1]) * 60 + Number(m[2]),
            end: Number(m[3]) * 60 + Number(m[4]),
          };
        }),
      )
      .default([]),
  })
  .strict();

/** Front matter between `+++` lines, per kind of document. */
export const worksheetFrontSchema = z
  .object({
    titel: title,
    einleitung: z.string().optional(),
    "arbeitsweise-wahl": z.boolean().default(true),
    folgeblatt: z.string().trim().min(1).optional(),
  })
  .strict();

export const summaryFrontSchema = z
  .object({ titel: title.optional() })
  .strict();

export const foliensatzFrontSchema = z
  .object({
    titel: title,
    "in-uebersicht": z.boolean().default(true),
  })
  .strict();

/** `challenges.md` and quizzes have no front matter fields. */
export const emptyFrontSchema = z.object({}).strict();
