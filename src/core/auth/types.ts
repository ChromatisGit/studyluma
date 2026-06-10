import type { UserDTO as BaseUserDTO, Session as BaseSession } from "@chromatis/base/auth";

export type UserDTO = BaseUserDTO & {
  groupKey: string | null;
  courseIds: string[];
};

export type Session = BaseSession<UserDTO>;
