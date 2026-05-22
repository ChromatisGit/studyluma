import { createDb, makeAnonSql, makeUserSql } from "@platform/framework/db";
import { getDatabaseUrl, getDbDriver } from "@platform/framework/runtime";
import type { DbClient, UserCtx } from "@platform/framework/db";

let _db: DbClient | null = null;

export function getDb(): DbClient {
  return (_db ??= createDb(getDatabaseUrl(), getDbDriver()));
}

/** Anonymous SQL — no RLS user context. For public reads, login, SECURITY DEFINER calls. */
export const anonSQL = makeAnonSql(getDb());

/** Authenticated SQL — sets full RLS context. For all user-facing reads/writes. */
export function userSQL(user: UserCtx) {
  return makeUserSql(getDb(), user);
}

export const anonTx = getDb().anonTx.bind(getDb());
export const userTx = getDb().userTx.bind(getDb());
