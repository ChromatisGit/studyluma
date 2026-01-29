import "server-only";
import postgres from "postgres";
import { sql as vercelSql } from "@vercel/postgres";

type SqlValue = string | number | boolean | Date | null | undefined;

const isVercel = Boolean(process.env.VERCEL);

// Local: use postgres package directly with Bun
// Vercel: use @vercel/postgres for serverless connection pooling
const localSql = isVercel
  ? null
  : postgres(process.env.POSTGRES_URL!, {
      max: 10,
    });

/**
 * Execute a SQL query with parameterized values.
 * Works with both local postgres and Vercel postgres.
 */
export async function query<T>(
  strings: TemplateStringsArray,
  ...values: SqlValue[]
): Promise<T[]> {
  if (isVercel) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await vercelSql(strings, ...(values as any[]));
    return result.rows as T[];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await localSql!(strings, ...(values as any[]));
  return rows as unknown as T[];
}

/**
 * Execute a transaction (local only - Vercel doesn't support transactions in serverless).
 * On Vercel, executes statements sequentially without transaction wrapper.
 */
export async function transaction<T>(
  fn: (tx: {
    query: <R>(
      strings: TemplateStringsArray,
      ...values: SqlValue[]
    ) => Promise<R[]>;
  }) => Promise<T>
): Promise<T> {
  if (isVercel) {
    // Vercel serverless doesn't support transactions well
    // Execute sequentially without transaction wrapper
    return fn({ query });
  }

  return localSql!.begin(async (sql) => {
    return fn({
      query: async <R>(
        strings: TemplateStringsArray,
        ...values: SqlValue[]
      ): Promise<R[]> => {
        const rows = await sql.unsafe(
          strings.reduce((acc, str, i) => acc + str + (i < values.length ? `$${i + 1}` : ""), ""),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          values as any[]
        );
        return rows as unknown as R[];
      },
    });
  }) as Promise<T>;
}
