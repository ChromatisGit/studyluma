import { redirect } from "react-router";

/** The website starts at the course list; the demo app owns "/". */
export function loader() {
  return redirect("/courses");
}
