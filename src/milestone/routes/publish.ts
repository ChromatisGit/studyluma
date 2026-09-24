import { bundleSchema, publishBundle } from "../publish";

export async function action({ request }: { request: Request }) {
  const token = process.env.PUBLISH_TOKEN;
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
  await publishBundle(result.data);
  return Response.json({ ok: true, chapterId: result.data.chapter.id });
}
