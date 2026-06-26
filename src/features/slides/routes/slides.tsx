import { getSession } from "@core/auth/session.server";
import { assertAdminAccess } from "@core/auth/guards";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  assertAdminAccess(session);
  throw new Response("Not found", { status: 404 });
}

export default function Slides() {
  return null;
}
