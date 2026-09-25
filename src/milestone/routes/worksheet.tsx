import { getResponse, getWorksheetForUser, saveResponse } from "../domain";
import { notFound, requireSignedIn } from "../server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function context(request: Request, publicKey?: string) {
  const user = await requireSignedIn(request);
  if (!publicKey || !UUID.test(publicKey)) return notFound();
  const worksheet = await getWorksheetForUser(user, publicKey);
  return { user, worksheet };
}

export async function loader({ request, params }: { request: Request; params: { publicKey?: string } }) {
  const { user, worksheet } = await context(request, params.publicKey);
  return { worksheet, answer: await getResponse(user, worksheet.id) };
}

export async function action({ request, params }: { request: Request; params: { publicKey?: string } }) {
  const { user, worksheet } = await context(request, params.publicKey);
  const form = await request.formData();
  const answer = form.get("answer");
  if (typeof answer !== "string" || answer.length > 10000) return { ok: false as const, error: "Antwort ist zu lang." };
  await saveResponse(user, worksheet.id, answer);
  return { ok: true as const };
}

export { default } from "../views/worksheet";
