/**
 * Database row types for raw SQL queries.
 */

export type UserRole = "admin" | "user";

export interface UserRow {
  id: string;
  role: UserRole;
  group_key: string | null;
  access_code: string;
  pin_hash: string;
}

export interface UserCourseRow {
  user_id: string;
  course_id: string;
}

export interface CourseRow {
  course_id: string;
  current_topic_id: string;
  current_chapter_id: string;
  registration_open_until: Date | null;
}

export type AuthBucketType = "ip" | "access_code_ip";

export interface AuthAttemptRow {
  bucket_type: AuthBucketType;
  ip: string;
  access_code: string;
  window_start: Date;
  last_attempt_at: Date;
  attempt_count: number;
  locked_until: Date | null;
  updated_at: Date;
}

export type AuditAction = "openRegistration" | "createUser" | "addCourseToUser";

export interface AuditLogRow {
  id: number;
  created_at: Date;
  ip: string | null;
  user_id: string | null;
  action: AuditAction;
  course_id: string | null;
}
