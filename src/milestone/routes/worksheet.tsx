import { getResponse, getWorksheetForUser, saveResponse } from "../domain";
import { notFound, requireSignedIn, type WebsiteLoadContext } from "../server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function worksheetContext(request: Request, context: WebsiteLoadContext, publicKey?: string) {
  const user = await requireSignedIn(request, context);
  if (!publicKey || !UUID.test(publicKey)) return notFound();
  const worksheet = await getWorksheetForUser(user, publicKey, context);
  return { user, worksheet };
}

export async function loader({ request, params, context }: { request: Request; params: { publicKey?: string }; context: WebsiteLoadContext }) {
  const { user, worksheet } = await worksheetContext(request, context, params.publicKey);
  return { worksheet, answer: await getResponse(user, worksheet.id, context) };
}

export async function action({ request, params, context }: { request: Request; params: { publicKey?: string }; context: WebsiteLoadContext }) {
  const { user, worksheet } = await worksheetContext(request, context, params.publicKey);
  const form = await request.formData();
  const answer = form.get("answer");
  if (typeof answer !== "string" || answer.length > 10000) return { ok: false as const, error: "Antwort ist zu lang." };
  await saveResponse(user, worksheet.id, answer, context);
  return { ok: true as const };
}

export { default } from "../views/worksheet";
