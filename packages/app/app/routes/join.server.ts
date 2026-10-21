import type { DataArgs } from "@chromatis/base/data";
import { normalizeJoinCode } from "../../src/modules/classroom";
import { classroomSettings } from "../../src/modules/classroom/server/classroom.server";

/**
 * `/:code` is where join links lead and `/join` is the form without a code.
 * Any other single path segment is not a join code and does not exist.
 */
export function loader({ params }: DataArgs) {
  const code = params.code === undefined ? "" : normalizeJoinCode(params.code);
  if (code === null) {
    throw new Response(null, { status: 404 });
  }
  return { code, maxNameLength: classroomSettings().maxNameLength };
}
