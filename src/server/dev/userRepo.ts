import "server-only";
import type { User } from "@schema/userTypes";
import type { StoredUser, InsertUserInput } from "../repo/types";
import { readJsonFile, writeJsonFile } from "./storage";

type UserRecord = {
  id: string;
  role: "admin" | "user";
  groupKey: string | null;
  accessCode: string;
  pinHash: string;
};

type UserCourseRecord = {
  userId: string;
  courseId: string;
};

const USERS_FILE = "users.json";
const USER_COURSES_FILE = "user-courses.json";

function getUsers(): UserRecord[] {
  return readJsonFile<UserRecord[]>(USERS_FILE, []);
}

function saveUsers(users: UserRecord[]): void {
  writeJsonFile(USERS_FILE, users);
}

function getUserCourses(): UserCourseRecord[] {
  return readJsonFile<UserCourseRecord[]>(USER_COURSES_FILE, []);
}

function saveUserCourses(records: UserCourseRecord[]): void {
  writeJsonFile(USER_COURSES_FILE, records);
}

function toUser(record: UserRecord, courseIds: string[]): User | null {
  if (record.role === "admin") {
    return { id: record.id, role: "admin" };
  }
  if (!record.groupKey) return null;
  return {
    id: record.id,
    role: "user",
    groupKey: record.groupKey,
    courseIds,
  };
}

export async function getUserById(userId: string): Promise<User | null> {
  const users = getUsers();
  const record = users.find((u) => u.id === userId);
  if (!record) return null;

  const userCourses = getUserCourses();
  const courseIds = userCourses
    .filter((uc) => uc.userId === userId)
    .map((uc) => uc.courseId);

  return toUser(record, courseIds);
}

export async function getUserByAccessCode(
  accessCode: string
): Promise<StoredUser | null> {
  const users = getUsers();
  const record = users.find((u) => u.accessCode === accessCode);
  if (!record) return null;

  const userCourses = getUserCourses();
  const courseIds = userCourses
    .filter((uc) => uc.userId === record.id)
    .map((uc) => uc.courseId);

  const user = toUser(record, courseIds);
  if (!user) return null;

  return {
    user,
    credentials: {
      accessCode: record.accessCode,
      pinHash: record.pinHash,
    },
  };
}

export async function insertUser(input: InsertUserInput): Promise<void> {
  const users = getUsers();
  const userCourses = getUserCourses();

  users.push({
    id: input.user.id,
    role: input.user.role,
    groupKey: input.user.role === "user" ? input.user.groupKey : null,
    accessCode: input.accessCode,
    pinHash: input.pinHash,
  });

  if (input.user.role === "user") {
    for (const courseId of input.user.courseIds) {
      userCourses.push({ userId: input.user.id, courseId });
    }
  }

  saveUsers(users);
  saveUserCourses(userCourses);
}

export async function addCourseToUser(
  userId: string,
  courseId: string
): Promise<void> {
  const userCourses = getUserCourses();
  const exists = userCourses.some(
    (uc) => uc.userId === userId && uc.courseId === courseId
  );
  if (!exists) {
    userCourses.push({ userId, courseId });
    saveUserCourses(userCourses);
  }
}

export async function getUserAccessCode(
  userId: string
): Promise<string | null> {
  const users = getUsers();
  const record = users.find((u) => u.id === userId);
  return record?.accessCode ?? null;
}

export async function getUserCount(): Promise<number> {
  const users = getUsers();
  return users.filter((u) => u.role === "user").length;
}
