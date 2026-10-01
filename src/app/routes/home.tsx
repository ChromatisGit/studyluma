import { canManageCourses, listCourses } from "../../modules/courses";
import {
  getDatabase,
  requireSignedIn,
  type WebsiteLoadContext,
} from "../services";

export async function loader({
  request,
  context,
  url,
}: {
  request: Request;
  context: WebsiteLoadContext;
  url: URL;
}) {
  const user = await requireSignedIn(request, context, url);
  const database = getDatabase(context);
  return {
    courses: await listCourses(user, database),
    isTeacher: await canManageCourses(user, database),
  };
}

export { HomeView as default } from "../../modules/courses";
