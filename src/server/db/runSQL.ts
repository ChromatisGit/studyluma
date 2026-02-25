import "server-only";
import { withAnonTx, withUserTx, type Tx } from "@db/tx";

type UserCtx = { id: string; role: string; groupKey: string | null };

/**
 * Tagged template function for anonymous SQL — no RLS user context.
 * Use for: public reads, login, registration, SECURITY DEFINER calls.
 */
export const anonSQL: Tx = ((template: TemplateStringsArray, ...params: never[]) =>
  withAnonTx((tx) => tx(template, ...params))) as unknown as Tx;

/**
 * Returns a tagged template function with user RLS context set.
 * Use for: all authenticated reads and writes.
 *
 * @example
 * const sql = userSQL(user);
 * const rows = await sql<CourseRow[]>`SELECT * FROM v_course_dto WHERE id = ${courseId}`;
 */
export function userSQL(user: UserCtx): Tx {
  return ((template: TemplateStringsArray, ...params: never[]) =>
    withUserTx(user, (tx) => tx(template, ...params))) as unknown as Tx;
}
