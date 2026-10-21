import type { DataArgs } from "@chromatis/base/data";
import { loadSite } from "./site.server";

/** What every page knows: the viewer, the courses and the release state. */
export async function loader({ request }: DataArgs) {
  return await loadSite(request);
}
