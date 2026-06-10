import { getSession } from "@core/index.server";
import { assertLoggedIn } from "@core/auth/guards";
import {
  saveCheckpointResponseService,
  syncWorksheetResponses,
  updatePresenceService,
} from "@services/worksheetService";
import type { CheckpointResponse } from "@schema/checkpointTypes";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { worksheetId?: string };
}) {
  const session = await getSession(request);
  assertLoggedIn(session);

  const worksheetId = params.worksheetId;
  if (!worksheetId) {
    return new Response("Missing worksheetId", { status: 400 });
  }

  const formData = await request.formData();
  const intent = getString(formData, "intent");

  try {
    if (intent === "sync-responses") {
      const responses = JSON.parse(getString(formData, "responses") || "{}") as Record<string, string>;
      await syncWorksheetResponses(worksheetId, responses, session.user);
      return json({ ok: true });
    }

    if (intent === "checkpoint") {
      const sectionIndex = Number(getString(formData, "sectionIndex"));
      const checkpoint = JSON.parse(getString(formData, "checkpoint") || "{}") as CheckpointResponse;
      await saveCheckpointResponseService(worksheetId, sectionIndex, checkpoint, session.user);
      return json({ ok: true });
    }

    if (intent === "presence") {
      const courseId = getString(formData, "courseId");
      const sectionIndex = Number(getString(formData, "sectionIndex"));
      await updatePresenceService(session.user, courseId, worksheetId, sectionIndex);
      return json({ ok: true });
    }

    return new Response("Unknown intent", { status: 400 });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Worksheet action failed" }, 500);
  }
}
