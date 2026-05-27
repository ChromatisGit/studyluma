import { createDb, makeAnonSql, makeUserSql } from "@chromatis/base/db";
import { getDatabaseUrl, getDbDriver } from "@chromatis/base/runtime";
import type { DbClient, DbSql, UserCtx } from "@chromatis/base/db";

let _db: DbClient | null = null;

function getDb(): DbClient {
  return (_db ??= createDb(getDatabaseUrl(), getDbDriver()));
}

function getDatabaseTarget(): string {
  try {
    const url = new URL(getDatabaseUrl());
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "the configured database";
  }
}

function extractErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : undefined;
}

function isConnectionRefusedError(error: unknown): boolean {
  const code = extractErrorCode(error);
  if (code === "ECONNREFUSED") return true;

  if (error instanceof AggregateError) {
    return error.errors.some((nested) => isConnectionRefusedError(nested));
  }

  return error instanceof Error && error.message.includes("ECONNREFUSED");
}

function toReadableDbError(error: unknown): Error {
  if (!isConnectionRefusedError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  return new Error(
    `Database connection failed: could not reach Postgres at ${getDatabaseTarget()}. `
      + `Start the local database with "bun run db:init" or "docker compose up -d --wait".`,
    { cause: error },
  );
}

function wrapDbPromise<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((error) => {
    throw toReadableDbError(error);
  });
}

function wrapSql(sql: DbSql): DbSql {
  const wrapped = ((first: TemplateStringsArray | string, ...values: unknown[]) => {
    if (typeof first === "string") {
      return sql(first);
    }

    return wrapDbPromise(
      sql(first, ...values),
    );
  }) as DbSql;

  wrapped.unsafe = (identifier: string) => sql.unsafe(identifier);
  return wrapped;
}

/** Anonymous SQL: no RLS user context. For public reads, login, SECURITY DEFINER calls. */
export const anonSQL = wrapSql(makeAnonSql(getDb()));

/** Authenticated SQL: sets full RLS context. For all user-facing reads/writes. */
export function userSQL(user: UserCtx) {
  return wrapSql(makeUserSql(getDb(), user));
}

