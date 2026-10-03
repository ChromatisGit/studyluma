import { redirect } from "react-router";
import { switchViewer } from "../../src/modules/viewer";
import type { Route } from "./+types/viewer";

export function loader() {
  return redirect("/");
}

export function action({ request }: Route.ActionArgs) {
  return switchViewer(request);
}
