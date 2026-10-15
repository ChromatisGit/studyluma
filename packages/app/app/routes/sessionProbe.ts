import type { LoaderFunctionArgs } from "react-router";
import {
  classroom,
  classroomError,
  clientKey,
} from "../../src/modules/classroom/server/classroom.server";

/**
 * Lets the Session Directory confirm that this instance runs a session:
 * 204 if the code is live, the usual not-found otherwise. It reveals no
 * more than the join page does and is rate-limited like it: per caller, so
 * that nobody can use up the allowance the Directory itself needs.
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    await classroom().lookup(params.code ?? "", `probe:${clientKey(request)}`);
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return classroomError(error);
  }
}
