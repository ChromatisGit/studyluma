import { getSession } from "@services/authService";
import { getActiveQuizForCourse } from "@services/quizService";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new Response(null, { status: 401 });
  }

  const { courseId } = await params;
  if (!courseId) {
    return NextResponse.json({ error: "Missing courseId" }, { status: 400 });
  }

  const state = await getActiveQuizForCourse(courseId, session.user);

  if (!state) {
    // No active quiz — student should stop polling (or poll less frequently)
    return new Response(null, { status: 410 });
  }

  const updatedAt = new Date(state.updatedAt);
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

  return NextResponse.json(state, {
    headers: {
      "Last-Modified": lastModified,
      "Cache-Control": "no-store, no-cache",
    },
  });
}
