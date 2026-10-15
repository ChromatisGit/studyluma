import { z } from "@chromatis/base/module";

/**
 * `config/classroom.toml`. Every value is what the classroom did before it
 * was configurable, so a missing file changes nothing.
 *
 * The join-code length and alphabet are deliberately not configurable: they
 * are one protocol shared by the join form, the cookie, every instance and
 * the Session Directory.
 */
export const classroomConfigSchema = z
  .object({
    /** How long a Classroom Session lives unless the controller ends it; also the lifetime of its cookie. */
    session_ttl_hours: z
      .number()
      .int()
      .min(1)
      .max(24)
      .default(12)
      .describe(
        "How long a Classroom Session lives unless the controller ends it, in hours; also the lifetime of its cookie.",
      ),
    /** Participants a session takes. */
    max_participants: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(120)
      .describe("Participants a session takes."),
    /** Longest participant name, in characters. */
    max_name_length: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(40)
      .describe("Longest participant name, in characters."),
    /** Sessions an instance runs at once. */
    max_sessions: z
      .number()
      .int()
      .min(1)
      .max(10000)
      .default(500)
      .describe("Classroom Sessions an instance runs at once."),
    /** Sessions one client may start within a window. */
    session_create_limit: z
      .object({
        max_creations: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(60)
          .describe("Sessions one client may start within the window."),
        window_seconds: z
          .number()
          .int()
          .min(1)
          .max(86400)
          .default(600)
          .describe("Length of the window, in seconds."),
      })
      .strict()
      .prefault({})
      .describe(
        "How many sessions one client may start; a school behind one address starts many at the bell.",
      ),
    /** Failed join-code lookups one client may make before it is stopped. */
    join_lookup_limit: z
      .object({
        max_failures: z
          .number()
          .int()
          .min(1)
          .max(1000)
          .default(20)
          .describe("Failed lookups allowed within the window."),
        window_seconds: z
          .number()
          .int()
          .min(1)
          .max(3600)
          .default(60)
          .describe("Length of the window, in seconds."),
      })
      .strict()
      .prefault({})
      .describe(
        "Failed join-code lookups one client may make before it is stopped.",
      ),
  })
  .strict();

export type ClassroomConfig = z.output<typeof classroomConfigSchema>;

/** What the classroom code works with: milliseconds and camelCase. */
export type ClassroomSettings = Readonly<{
  sessionTtlMs: number;
  maxParticipants: number;
  maxNameLength: number;
  maxSessions: number;
  createLimit: Readonly<{ maxCreations: number; windowMs: number }>;
  lookupLimit: Readonly<{ maxFailures: number; windowMs: number }>;
}>;

export function classroomSettingsFrom(
  config: ClassroomConfig,
): ClassroomSettings {
  return {
    sessionTtlMs: config.session_ttl_hours * 60 * 60 * 1000,
    maxParticipants: config.max_participants,
    maxNameLength: config.max_name_length,
    maxSessions: config.max_sessions,
    createLimit: {
      maxCreations: config.session_create_limit.max_creations,
      windowMs: config.session_create_limit.window_seconds * 1000,
    },
    lookupLimit: {
      maxFailures: config.join_lookup_limit.max_failures,
      windowMs: config.join_lookup_limit.window_seconds * 1000,
    },
  };
}

/** The settings of an empty `config/classroom.toml`: what tests and the workerd entry use. */
export const defaultClassroomSettings: ClassroomSettings =
  classroomSettingsFrom(classroomConfigSchema.parse({}));
