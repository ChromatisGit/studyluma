import type { User } from "@schema/userTypes";

/**
 * User Repository Types
 */
export type StoredUser = {
  user: User;
  credentials: {
    accessCode: string;
    pinHash: string;
  };
};

export type InsertUserInput = {
  user: User;
  accessCode: string;
  pinHash: string;
};

/**
 * Course Repository Types
 */
export type CourseState = {
  courseId: string;
  currentTopicId: string;
  currentChapterId: string;
  registrationOpenUntil: Date | null;
};

/**
 * Auth Repository Types
 */
export type BucketType = "ip" | "access_code_ip";

export type BucketState = {
  id: string;
  type: BucketType;
  ip: string;
  accessCode: string | null;
  windowStartedAt: Date;
  attemptCount: number;
  lockedUntil: Date | null;
  lastAttemptAt: Date;
};

/**
 * Audit Repository Types
 */
export type AuditAction = "openRegistration" | "createUser" | "addCourseToUser";

export type AuditEntry = {
  ip: string;
  userId: string | null;
  action: AuditAction;
  courseId?: string | null;
};
