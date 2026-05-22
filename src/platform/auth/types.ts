export type UserDTO = {
  id: string;
  role: "admin" | "user";
  groupKey: string | null;
  courseIds: string[];
};

export type Session = { user: UserDTO };
