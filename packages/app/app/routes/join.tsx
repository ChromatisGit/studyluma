import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { JoinPage, normalizeJoinCode } from "../../src/modules/classroom";
import { classroomSettings } from "../../src/modules/classroom/server/classroom.server";

export function meta() {
  return [{ title: "Unterricht beitreten" }];
}

/**
 * `/:code` is where join links lead and `/join` is the form without a code.
 * Any other single path segment is not a join code and does not exist.
 */
export function loader({ params }: LoaderFunctionArgs) {
  const code = params.code === undefined ? "" : normalizeJoinCode(params.code);
  if (code === null) {
    throw new Response(null, { status: 404 });
  }
  return { code, maxNameLength: classroomSettings().maxNameLength };
}

/** Where students enter a join code; the QR code and join links lead here. */
export default function JoinRoute() {
  const { code, maxNameLength } = useLoaderData<typeof loader>();
  return (
    <JoinPage
      initialCode={code}
      coursesPath="/courses"
      maxNameLength={maxNameLength}
    />
  );
}
