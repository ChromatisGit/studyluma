import { redirect } from "react-router";

/** The website starts in the established course UI. */
export function loader() {
  return redirect("/courses");
}
