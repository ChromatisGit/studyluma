import { listCourses } from "../../modules/courses";
import {
  getDatabase,
  requireSignedIn,
  type WebsiteLoadContext,
} from "../services";

export async function loader({
  request,
  context,
}: {
  request: Request;
  context: WebsiteLoadContext;
}) {
  const user = await requireSignedIn(request, context);
  return { courses: await listCourses(user, getDatabase(context)) };
}

export { HomeView as default } from "../../modules/courses";
