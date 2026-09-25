import { redirect } from "react-router";
import { getSessionManager } from "../server";

export async function action({ request }: { request: Request }) {
  const session = await getSessionManager().resolve(request);
  const cookie = await getSessionManager().logout(session);
  throw redirect("/login", { headers: { "Set-Cookie": cookie } });
}

export { default } from "../views/logout";
