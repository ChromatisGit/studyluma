import { Form, useActionData, useLoaderData } from "react-router";
import { getResponse, getWorksheetForUser, saveResponse } from "../domain";
import { notFound, requireSignedIn } from "../server";
import { MarkdownRenderer } from "../../ui/components/MarkdownRenderer/MarkdownRenderer";

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

export default function WorksheetPage() {
  const { worksheet, answer } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  return <main><h1>{worksheet.title}</h1><div className="card"><MarkdownRenderer markdown={worksheet.body} /></div><div className="card"><Form method="post"><label><span>Meine Antwort</span><textarea name="answer" rows={8} defaultValue={answer} key={answer} /></label>{result?.ok && <p className="success" role="status">Antwort gespeichert.</p>}{result && !result.ok && <p className="error" role="alert">{result.error}</p>}<button type="submit">Speichern</button></Form></div></main>;
}
