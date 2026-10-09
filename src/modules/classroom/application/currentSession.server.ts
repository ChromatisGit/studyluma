import type { Releases as CatalogReleases } from "../../catalog";
import type { Snapshot } from "../domain/protocol";
import type { Releases } from "../domain/session";
import { readClassroomAuth } from "../infrastructure/classroomCookie";
import { classroom } from "../infrastructure/classroomServer.server";

/** The session this browser belongs to, if it is still running. */
export async function currentSnapshot(
  request: Request,
): Promise<Snapshot | null> {
  const auth = readClassroomAuth(request);
  if (!auth) {
    return null;
  }
  try {
    return await classroom().snapshot(auth);
  } catch {
    // Ended, expired or a stale cookie: as if there were no session.
    return null;
  }
}

const NOTHING: Releases = { summaries: [], solutions: [], rules: {} };

/** What the browser's session released, as lists and as catalog lookups. */
export async function currentReleases(request: Request): Promise<{
  view: Releases;
  releases: CatalogReleases;
  snapshot: Snapshot | null;
}> {
  const snapshot = await currentSnapshot(request);
  const view = snapshot?.releases ?? NOTHING;
  return {
    view,
    snapshot,
    releases: releasesFrom(view),
  };
}

export function releasesFrom(view: Releases): CatalogReleases {
  const summaries = new Set(view.summaries);
  const solutions = new Set(view.solutions);
  return {
    summary: (chapterId) => summaries.has(chapterId),
    solution: (taskId) => solutions.has(taskId),
  };
}
