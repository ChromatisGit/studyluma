import type { DataArgs } from "@chromatis/base/data";
import { loadCourses } from "../site.server";
import { readViewer } from "../../src/modules/classroom";

export async function loader({ request }: DataArgs) {
  return {
    courses: loadCourses(request),
    viewer: await readViewer(request),
  };
}
