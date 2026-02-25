/**
 * Transaction wrappers with RLS context injection.
 *
 * THIS IS THE ONLY FILE ALLOWED TO IMPORT RAW `sql`.
 * All other server code must use withUserTx() or withAnonTx().
 *
 * RLS is fail-safe: if context is not set, policies return empty results.
 * current_setting('app.user_id', true) returns NULL when unset.
 * NULL comparisons evaluate to NULL → row is filtered out.
 */

import "server-only";
import postgres from "postgres";

const sql = postgres(process.env.POSTGRES_URL!, { max: 10 });

// postgres.TransactionSql extends Omit<Sql,...> which strips call signatures,
// making tx`...` fail type-checking even though it works at runtime.
// We return Promise<T> directly (not PendingQuery<T>) so callers get clean row
// types without the RowList wrapper that obscures narrowing.
export interface Tx {
  <T extends readonly (object | undefined)[] = postgres.Row[]>(
    template: TemplateStringsArray,
    ...parameters: readonly postgres.ParameterOrFragment<never>[]
  ): Promise<T>;
}

async function setContext(
  tx: postgres.TransactionSql,
  userId: string | null,
  role: string | null,
  groupKey: string | null,
): Promise<void> {
  // true = transaction-local; cleared automatically at end of transaction
  await tx.unsafe(
    `SELECT set_config('app.user_id', $1, true),
            set_config('app.user_role', $2, true),
            set_config('app.group_key', $3, true)`,
    [userId ?? "", role ?? "", groupKey ?? ""],
  );
}

/**
 * Anonymous transaction — no RLS user context.
 * Policies requiring app.user_id will return empty results.
 * Use for: login, registration, public data reads.
 */
export async function withAnonTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await setContext(tx, null, null, null);
    return fn(tx as unknown as Tx);
  }) as Promise<T>;
}

/**
 * Authenticated transaction — sets full RLS context from user object.
 * Use for: any user-facing data read or write.
 */
export async function withUserTx<T>(
  user: { id: string; role: string; groupKey: string | null },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await setContext(tx, user.id, user.role, user.groupKey);
    return fn(tx as unknown as Tx);
  }) as Promise<T>;
}
