import { createDb, makeAnonSql, makeUserSql, wrapSql } from "@chromatis/base/db";
import { getDatabaseUrl, getDbDriver } from "@chromatis/base/runtime";
import type { DbClient, DbSql, UserCtx } from "@chromatis/base/db";

let _db: DbClient | null = null;

function getDb(): DbClient {
  return (_db ??= createDb(getDatabaseUrl(), getDbDriver()));
}

/** Anonymous SQL: no RLS user context. For public reads, login, SECURITY DEFINER calls. */
export const anonSQL: DbSql = wrapSql(makeAnonSql(getDb()));

/** Authenticated SQL: sets full RLS context. For all user-facing reads/writes. */
export function userSQL(user: UserCtx): DbSql {
  return wrapSql(makeUserSql(getDb(), user));
}
