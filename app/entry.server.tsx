import { renderToReadableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import type { AppLoadContext, EntryContext } from "react-router";

export default async function handleRequest(request: Request, status: number, headers: Headers, context: EntryContext, _loadContext: AppLoadContext) {
  const body = await renderToReadableStream(<ServerRouter context={context} url={request.url} />, { signal: request.signal });
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(body, { status, headers });
}
