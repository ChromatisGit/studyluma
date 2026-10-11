import type { LoaderFunctionArgs } from "react-router";
import {
  classroom,
  classroomError,
} from "../../src/modules/classroom/server/classroom.server";

/**
 * Lets the Session Directory confirm that this instance runs a session:
 * 204 if the code is live, the usual not-found otherwise. It reveals no
 * more than the join page does and is rate-limited like it.
 */
export async function loader({ params }: LoaderFunctionArgs) {
  try {
    await classroom().lookup(params.code ?? "", "session-directory");
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return classroomError(error);
  }
}
