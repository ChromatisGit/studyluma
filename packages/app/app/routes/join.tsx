import { useLoaderData } from "react-router";
import { JoinPage } from "../../src/modules/classroom";
import type { loader } from "./join.server";

export function meta() {
  return [{ title: "Unterricht beitreten" }];
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
