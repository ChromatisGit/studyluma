import { bundleSchema, publishBundle } from "../publish";
import { getRuntime, type WebsiteLoadContext } from "../server";
import { readSecret } from "@chromatis/base/secrets";
import { publishTokenSecret } from "../../app/config/secrets";

export async function action({ request, context }: { request: Request; context: WebsiteLoadContext }) {
  const token = readSecret(publishTokenSecret, getRuntime(context).secrets);
  if (!token || request.headers.get("Authorization") !== `Bearer ${token}`) return new Response("Unauthorized", { status: 401 });
  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 250000) return new Response("Bundle too large", { status: 413 });
  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 250000) return new Response("Bundle too large", { status: 413 });
    input = JSON.parse(body);
  } catch { return new Response("Invalid JSON", { status: 400 }); }
  const result = bundleSchema.safeParse(input);
  if (!result.success) return Response.json({ error: "Invalid bundle", details: result.error.flatten() }, { status: 400 });
  await publishBundle(result.data, context);
  return Response.json({ ok: true, chapterId: result.data.chapter.id });
}
