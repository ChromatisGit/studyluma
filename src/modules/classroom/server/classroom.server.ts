/**
 * Everything the Website's server code needs from the classroom: sessions,
 * credentials and the protocol. Kept apart from `index.ts` so browser code
 * never imports server modules.
 */
export {
  actInSession,
  classroomError,
} from "../application/classroomHttp.server";
export {
  currentReleases,
  currentSnapshot,
  releasesFrom,
} from "../application/currentSession.server";
export {
  classroomDefinitions,
  classroom,
  configureClassroom,
} from "../infrastructure/classroomServer.server";
export {
  classroomCookie,
  clearClassroomCookie,
  clientKey,
  readClassroomAuth,
} from "../infrastructure/classroomCookie";
export { parseClientMessage } from "../domain/protocol";
export { validQuestions } from "../domain/quiz";
export { readViewer, viewerCookie } from "../infrastructure/viewerCookie";
export {
  CLASSROOM_SOCKET_ROUTE,
  handleClassroomSocket,
} from "../application/socketRoute";
export { createFailureLimiter } from "../application/rateLimit";
export type { FailureLimiter } from "../application/rateLimit";
export type { SessionRegistry } from "../application/classroomService";
export { normalizeJoinCode } from "../domain/joinCode";
