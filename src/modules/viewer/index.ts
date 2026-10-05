export { isViewerRole, viewerRoles } from "./domain/viewer";
export type { ViewerRole } from "./domain/viewer";
export { readViewer, viewerCookie } from "./infrastructure/viewerCookie";
export { switchViewer } from "./infrastructure/viewerAction";
export { ViewerSwitch } from "./ui/ViewerSwitch";
export type { ViewerSwitchProps } from "./ui/ViewerSwitch";
export { default as viewerText } from "./ui/viewer.de.json";
export {
  readParticipant,
  readRoom,
  roomCookie,
} from "./infrastructure/identityCookies";
