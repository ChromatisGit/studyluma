import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { switchViewer } from "../../src/modules/viewer";

export function loader() {
  return redirect("/");
}

export function action({ request }: ActionFunctionArgs) {
  return switchViewer(request);
}
