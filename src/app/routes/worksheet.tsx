import {
  getResponse,
  getWorksheetForUser,
  prepareWorksheetAnswer,
  saveResponse,
} from "../../modules/worksheets";
import {
  getDatabase,
  notFound,
  requireSignedIn,
  type WebsiteLoadContext,
} from "../services";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function worksheetContext(
  request: Request,
  context: WebsiteLoadContext,
  url: URL,
  publicKey?: string,
) {
  const user = await requireSignedIn(request, context, url);
  if (!publicKey || !UUID.test(publicKey)) {
    return notFound();
  }
  const worksheet =
    (await getWorksheetForUser(user, publicKey, getDatabase(context))) ??
    notFound();
  return { user, worksheet };
}

export async function loader({
  request,
  params,
  context,
  url,
}: {
  request: Request;
  params: { publicKey?: string };
  context: WebsiteLoadContext;
  url: URL;
}) {
  const { user, worksheet } = await worksheetContext(
    request,
    context,
    url,
    params.publicKey,
  );
  if (worksheet.is_locked) {
    return { worksheet, answer: "" };
  }
  return {
    worksheet,
    answer: await getResponse(user, worksheet.id, getDatabase(context)),
  };
}

export async function action({
  request,
  params,
  context,
  url,
}: {
  request: Request;
  params: { publicKey?: string };
  context: WebsiteLoadContext;
  url: URL;
}) {
  const { user, worksheet } = await worksheetContext(
    request,
    context,
    url,
    params.publicKey,
  );
  if (worksheet.is_locked) {
    return new Response("Arbeitsblatt gesperrt", { status: 403 });
  }
  const form = await request.formData();
  const answer = form.get("answer");
  if (typeof answer !== "string") {
    return { ok: false as const, error: "Antwort ist zu lang." };
  }
  const prepared = prepareWorksheetAnswer(
    worksheet.body,
    answer,
    form.get("intent") === "complete",
  );
  if (!prepared.ok) {
    return { ok: false as const, error: prepared.error };
  }
  await saveResponse(user, worksheet.id, prepared.answer, getDatabase(context));
  return { ok: true as const, completed: prepared.completed };
}

export { WorksheetView as default } from "../../modules/worksheets";
