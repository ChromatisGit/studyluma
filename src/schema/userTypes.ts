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

export function isAdmin(user: User): user is AdminUser {
  return user.role === "admin";
}