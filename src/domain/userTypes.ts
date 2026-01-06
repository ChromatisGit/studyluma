export type DefaultUser = {
  id: string;
  role: "user";
  groupKey: string;
  courseIds: string[];
};

export type AdminUser = {
  id: string;
  role: "admin";
};

export type User = DefaultUser | AdminUser;

/**
 * Mock-only credentials.
 * Keep separate from User so you can swap auth later without touching app logic.
 */
export type MockCredentials = {
  accessCode: string;
  pin: string; // later: pinHash + salt (not part of schema if you move to real auth)
};

export function isAdmin(user: User): user is AdminUser {
  return user.role === "admin";
}