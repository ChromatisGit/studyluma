import { listCourses } from "../domain";
import { requireSignedIn } from "../server";

export async function loader({ request }: { request: Request }) {
  const user = await requireSignedIn(request);
  return { courses: await listCourses(user) };
}

export { default } from "../views/home";
