import { getSession } from "@core/index.server";
import { assertAdminAccess } from "@core/auth/guards";
import { getClientIp } from "@server-lib/getClientIp";
import {
  closeRegistration,
  getRegistrationWindow,
  openRegistration,
  setCourseProgress,
  toggleWorksheetSolutionVisibilityService,
  toggleWorksheetVisibilityService,
} from "@services/courseService";
import { getWorksheetMonitorService } from "@services/worksheetService";
import { listSlideDecks } from "@services/slideService";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function action({ request }: { request: Request }) {
  const session = await getSession(request);
  assertAdminAccess(session);
  const body = await request.json() as Record<string, unknown>;
  const intent = text(body.intent);

  try {
    switch (intent) {
      case "set-progress":
        await setCourseProgress(text(body.courseId), text(body.topicId), text(body.chapterId));
        return json({ ok: true });
      case "registration-status": {
        const openUntil = await getRegistrationWindow(text(body.courseId));
        return json({ ok: true, data: { isOpen: Boolean(openUntil), openUntil } });
      }
      case "open-registration": {
        const openUntil = await openRegistration(text(body.courseId), session.user.id, getClientIp(request));
        return json({ ok: true, data: { openUntil: openUntil.toISOString() } });
      }
      case "close-registration":
        await closeRegistration(text(body.courseId));
        return json({ ok: true, data: { openUntil: null } });
      case "toggle-worksheet-visibility":
        await toggleWorksheetVisibilityService(
          session.user,
          text(body.courseId),
          text(body.worksheetId),
          Boolean(body.isHidden),
        );
        return json({ ok: true });
      case "toggle-worksheet-solution-visibility":
        await toggleWorksheetSolutionVisibilityService(
          session.user,
          text(body.courseId),
          text(body.worksheetId),
          Boolean(body.isSolutionHidden),
        );
        return json({ ok: true });
      case "worksheet-monitor": {
        const data = await getWorksheetMonitorService(
          session.user,
          text(body.courseId),
          text(body.worksheetId),
        );
        return json({ ok: true, data });
      }
      case "list-slide-decks": {
        const slideIds = await listSlideDecks({
          subject: text(body.subject),
          topicId: text(body.topicId),
          chapterId: text(body.chapterId),
        });
        return json({ ok: true, data: { slideIds } });
      }
      default:
        return json({ ok: false, error: "Unknown action" }, 400);
    }
  } catch (error) {
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Action failed",
    }, 500);
  }
}
