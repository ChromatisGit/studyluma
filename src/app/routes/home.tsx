import { canManageCourses, listCourses } from "../../modules/courses";
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
  const database = getDatabase(context);
  return {
    courses: await listCourses(user, database),
    isTeacher: await canManageCourses(user, database),
  };
}

export { HomeView as default } from "../../modules/courses";
