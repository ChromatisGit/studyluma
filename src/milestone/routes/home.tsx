import { listCourses } from "../domain";
import { requireSignedIn, type WebsiteLoadContext } from "../server";

export async function loader({ request, context }: { request: Request; context: WebsiteLoadContext }) {
  const user = await requireSignedIn(request, context);
  return { courses: await listCourses(user, context) };
}

export { default } from "../views/home";
