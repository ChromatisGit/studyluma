// Single source of truth for the StudyNode domain schema.
//
// StudyNode is currently server-only (no local SQLite). The schema is defined
// here using the same defineTable() DSL as DropSort so that:
//   1. Server-side TypeScript types are generated from a single definition.
//   2. When offline support is added, the SQLite DDL and sync metadata are
//      already structured — just wire up the SQLite runtime and add clientOnly
//      sync columns to the tables that need offline support.
//
// Tables with composite primary keys (course_topics, course_chapters,
// course_worksheets, user_courses, worksheet_presence) use raw SQL migrations
// for now — defineTable() will gain composite PK support in a future iteration.

import { col, defineTable } from "@chromatis/base/schema";
export type { PgRow, SlRow } from "@chromatis/base/schema";

// ─── Reference / lookup tables ────────────────────────────────────────────────
// No user_id — managed by admins, potentially cacheable on the client.

export const groups = defineTable("groups", {
  group_id:    col.text().primaryKey(),
  group_label: col.text().notNull(),
  group_key:   col.text().notNull(),
});

export const subjects = defineTable("subjects", {
  subject_id:    col.text().primaryKey(),
  subject_label: col.text().notNull(),
});

export const course_variants = defineTable("course_variants", {
  variant_id:    col.text().primaryKey(),
  variant_label: col.text().notNull(),
  variant_short: col.text().notNull(),
});

// ─── Content tables ───────────────────────────────────────────────────────────
// Server-managed course content. No user_id.

export const courses = defineTable("courses", {
  course_id:               col.text().primaryKey(),
  group_id:                col.text().notNull(),
  subject_id:              col.text().notNull(),
  variant_id:              col.text().nullable(),
  slug:                    col.text().notNull(),
  icon:                    col.text().nullable(),
  color:                   col.text().notNull(),
  worksheet_format:        col.text().notNull(),
  is_listed:               col.boolean().notNull().default("TRUE"),
  is_public:               col.boolean().notNull().default("FALSE"),
  registration_open_until: col.timestamp().nullable(),
  created_at:              col.timestamp().notNull().default("NOW()"),
  updated_at:              col.timestamp().notNull().default("NOW()"),
});

export const topics = defineTable("topics", {
  topic_id:  col.text().primaryKey(),
  label:     col.text().notNull(),
  href_slug: col.text().notNull(),
});

export const chapters = defineTable("chapters", {
  chapter_id: col.text().primaryKey(),
  label:      col.text().notNull(),
  href_slug:  col.text().notNull(),
});

export const worksheets = defineTable("worksheets", {
  worksheet_id:    col.text().primaryKey(),
  label:           col.text().notNull(),
  href_slug:       col.text().notNull(),
  worksheet_format: col.text().notNull(),
  source_filename: col.text().notNull().default("''"),
});

// ─── User progress tables ─────────────────────────────────────────────────────
// These are candidates for future offline sync. user_id is serverOnly because
// the local SQLite database only ever stores one user's data.

export const task_responses = defineTable("task_responses", {
  // shared — would be synced in offline mode
  id:           col.integer().primaryKey(),
  worksheet_id: col.text().notNull(),
  task_key:     col.text().notNull(),
  value:        col.text().notNull(),
  updated_at:   col.timestamp().notNull().default("NOW()"),
  // serverOnly — omitted from SQLite when offline is added
  user_id:      col.text().notNull().serverOnly(),
});

export const checkpoint_responses = defineTable("checkpoint_responses", {
  // shared
  id:                   col.integer().primaryKey(),
  worksheet_id:         col.text().notNull(),
  section_index:        col.integer().notNull(),
  understanding_level:  col.text().notNull(),
  submitted_at:         col.timestamp().notNull().default("NOW()"),
  // serverOnly
  user_id:              col.text().notNull().serverOnly(),
  // Note: difficulty_causes TEXT[] has no SQLite equivalent — use JSON TEXT
  // when adding offline support.
});

// ─── Server-only / infrastructure tables ─────────────────────────────────────
// These will not be synced to the client.

export const slide_state = defineTable("slide_state", {
  course_id:   col.text().primaryKey(),
  slide_index: col.integer().notNull().default("0"),
  blackout:    col.boolean().notNull().default("FALSE"),
  macro_state: col.json().notNull(),
  // All server-only — no offline use case
  updated_at: col.timestamp().notNull().default("NOW()"),
});

// ─── Derived server types ─────────────────────────────────────────────────────

import type { PgRow } from "@chromatis/base/schema";

export type Group          = PgRow<typeof groups["columns"]>;
export type Subject        = PgRow<typeof subjects["columns"]>;
export type CourseVariant  = PgRow<typeof course_variants["columns"]>;
export type Course         = PgRow<typeof courses["columns"]>;
export type Topic          = PgRow<typeof topics["columns"]>;
export type Chapter        = PgRow<typeof chapters["columns"]>;
export type Worksheet      = PgRow<typeof worksheets["columns"]>;
export type TaskResponse   = PgRow<typeof task_responses["columns"]>;
export type CheckpointResponse = PgRow<typeof checkpoint_responses["columns"]>;
