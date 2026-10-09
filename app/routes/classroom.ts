import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import { quizQuestions } from "../../src/modules/lessons";
import {
  clearClassroomCookie,
  classroomCookie,
  classroomError,
  classroom,
  clientKey,
  currentSnapshot,
  parseClientMessage,
  readClassroomAuth,
  readViewer,
  validQuestions,
  viewerCookie,
} from "../../src/modules/classroom/server/classroom.server";

/** The browser's session as a snapshot; students poll it where no socket exists. */
export async function loader({ request }: LoaderFunctionArgs) {
  if (request.headers.get("upgrade")?.toLowerCase() === "websocket") {
    // Sockets are accepted by the server entry; getting here means the
    // runtime has none (the Vite dev server).
    return new Response(null, { status: 426 });
  }
  return Response.json(
    { snapshot: await currentSnapshot(request) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function startQuiz(input: Record<string, unknown>) {
  const { courseId, chapterId, frameId } = input;
  if (
    typeof courseId !== "string" ||
    typeof chapterId !== "string" ||
    typeof frameId !== "string"
  ) {
    return null;
  }
  const catalog = getCatalog();
  const placement = catalog.presentations
    .filter((presentation) => presentation.chapterId === chapterId)
    .flatMap((presentation) => presentation.placements)
    .find((item) => item.id === frameId && item.kind === "quiz");
  const quiz = catalog.quizzes.find((item) => item.id === placement?.targetId);
  const questions = quiz && quizQuestions(quiz);
  if (!quiz || !questions || !validQuestions(questions)) {
    return null;
  }
  return {
    type: "quiz.start" as const,
    courseId,
    chapterId,
    frameId,
    title: quiz.title,
    questions,
  };
}

/** Starting, joining and steering a Classroom Session over plain HTTP. */
export async function action({ request }: ActionFunctionArgs) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.intent !== "string") {
    return new Response(null, { status: 400 });
  }
  try {
    switch (body.intent) {
      case "create": {
        if (readViewer(request) !== "teacher") {
          return new Response(null, { status: 403 });
        }
        const catalog = getCatalog();
        const auth = await classroom().create({
          buildId: catalog.buildId,
          courseId: typeof body.courseId === "string" ? body.courseId : null,
          title: typeof body.title === "string" ? body.title.slice(0, 80) : "",
        });
        return Response.json(
          { code: auth.code },
          {
            headers: [
              ["Set-Cookie", classroomCookie(request, auth)],
              ["Set-Cookie", viewerCookie("teacher")],
            ],
          },
        );
      }
      case "join": {
        const joined = await classroom().join(
          String(body.code ?? ""),
          String(body.name ?? ""),
          clientKey(request),
        );
        return Response.json(
          { code: joined.code },
          {
            headers: [
              ["Set-Cookie", classroomCookie(request, joined)],
              ["Set-Cookie", viewerCookie("student")],
            ],
          },
        );
      }
      case "leave":
        return new Response(null, {
          status: 204,
          headers: { "Set-Cookie": clearClassroomCookie(request) },
        });
      case "quiz.start": {
        const intent = startQuiz(body);
        if (!intent) {
          return new Response(null, { status: 400 });
        }
        return await act(request, intent);
      }
      case "act": {
        const message = parseClientMessage(
          JSON.stringify({ type: "intent", intent: body.payload }),
        );
        return message?.type === "intent"
          ? await act(request, message.intent)
          : new Response(null, { status: 400 });
      }
      default:
        return new Response(null, { status: 400 });
    }
  } catch (error) {
    return classroomError(error);
  }
}

async function act(
  request: Request,
  intent: Parameters<ReturnType<typeof classroom>["act"]>[1],
) {
  const auth = readClassroomAuth(request);
  if (!auth) {
    return new Response(null, { status: 409 });
  }
  await classroom().act(auth, intent);
  return new Response(null, { status: 204 });
}
