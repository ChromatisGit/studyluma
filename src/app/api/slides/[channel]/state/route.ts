import { getSession, isAdmin } from "@services/authService";
import { getSlideSession } from "@services/slideService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CHANNEL_RE = /^[a-z0-9-]{1,64}$/;
const STALE_MS = 15 * 60 * 1000;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return new Response(null, { status: 401 });
  }

  const { channel } = await params;
  if (!CHANNEL_RE.test(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const row = await getSlideSession(channel);

  if (!row) return new Response(null, { status: 404 });

  if (Date.now() - new Date(row.last_heartbeat).getTime() > STALE_MS) {
    return new Response(null, { status: 410 });
  }

  const updatedAt = new Date(row.updated_at);
  const lastModified = updatedAt.toUTCString();
  const ifModifiedSince = req.headers.get("If-Modified-Since");
  // Compare at second precision: toUTCString() truncates ms, so a direct Date
  // comparison would always fail and never return 304.
  if (
    ifModifiedSince &&
    Math.floor(updatedAt.getTime() / 1000) <= Math.floor(new Date(ifModifiedSince).getTime() / 1000)
  ) {
    return new Response(null, {
      status: 304,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(row.state, {
    headers: {
      "Last-Modified": lastModified,
      "Cache-Control": "no-store, no-cache",
    },
  });
}
