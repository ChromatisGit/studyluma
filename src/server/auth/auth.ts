import "server-only";

import type { Session } from "@/domain/session";
import { User, MockCredentials, DefaultUser, isAdmin } from "@/domain/userTypes";
import { notFound } from "next/navigation";
import { coursePublic } from "../data/courses";


export type MockCredentialRecord = Record<User["id"], MockCredentials>;

export const MOCK_USERS: Record<string, User> = {
  "s1234": {
    id: "s1234",
    role: "user",
    groupKey: "tg1",
    courseIds: ["tg1-info-tgtm"],
  },
  "a0001": {
    id: "a0001",
    role: "admin",
  },
};

export const MOCK_CREDENTIALS: MockCredentialRecord = {
  "s1234": {
    accessCode: "p",
    pin: "p",
  },
  "a0001": {
    accessCode: "t",
    pin: "t",
  },
};

export type { Session } from "@/domain/session";

export async function getSession(): Promise<Session | null> {
  // TODO: replace with real auth
  const user: DefaultUser = {
    id: "mock-user",
    role: "user",
    groupKey: "TG1",
    courseIds: ["TG1-inf-1", "TG1-math-1"],
  };

  // TODO: admin test user
  // const user: AdminUser = {
  //   id: "admin-1",
  //   role: "admin",
  // };

  return { user };

  // TODO: logged-out state
  // return null;
}

export function assertLoggedIn(
  session: Session | null
): asserts session is Session {
  if (!session) {
    notFound();
  }
}

export function assertCanAccessPage(session: Session | null, groupKey: string, courseId?: string): void {
  assertLoggedIn(session);
  if (!canUserAccessPage(session.user, groupKey, courseId)) {
    notFound();
  }
}

export function canUserAccessPage(user: User, groupKey: string, courseId?: string): boolean {
  if (isAdmin(user)) return true;

  if (courseId && coursePublic(courseId)) return true;

  if (user.groupKey !== groupKey) return false;

  if (courseId && !user.courseIds.includes(courseId)) return false;

  return true;
}
