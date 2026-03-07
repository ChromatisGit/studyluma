import { getSession, isAdmin } from "@services/authService";
import { getQuizResultsByChannel } from "@services/quizService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return new Response(null, { status: 401 });
  }

  const { channel } = await params;
  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  const results = await getQuizResultsByChannel(channel, session.user);

  if (!results) {
    // No active quiz on this channel
    return new Response(null, { status: 410 });
  }

  if (results.phase === "closed") {
    return new Response(null, { status: 410 });
  }

  const updatedAt = new Date(results.updatedAt);
  const lastModified = updatedAt.toUTCString();
  const ifModifiedSince = req.headers.get("If-Modified-Since");

  if (
    ifModifiedSince &&
    Math.floor(updatedAt.getTime() / 1000) <=
      Math.floor(new Date(ifModifiedSince).getTime() / 1000)
  ) {
    return new Response(null, {
      status: 304,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(results, {
    headers: {
      "Last-Modified": lastModified,
      "Cache-Control": "no-store, no-cache",
    },
  });
}
