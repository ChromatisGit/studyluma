import { redirect } from "react-router";
import { getSessionManager, type WebsiteLoadContext } from "../services";

export async function action({
  request,
  context,
}: {
  request: Request;
  context: WebsiteLoadContext;
}) {
  const session = await getSessionManager(context).resolve(request);
  const cookie = await getSessionManager(context).logout(session);
  throw redirect("/login", { headers: { "Set-Cookie": cookie } });
}

export { default } from "../views/logout";
