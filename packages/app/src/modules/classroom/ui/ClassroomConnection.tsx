import type { ReactNode } from "react";
import {
  SharedClassroomContext,
  useClassroom,
} from "../application/useClassroom";
import { useSite } from "./SiteContext";

/**
 * A browser in a session opens one connection to it for everything below,
 * so moving between pages (the calm view and the course) keeps the socket.
 */
export function ClassroomConnection({ children }: { children: ReactNode }) {
  const { classroom } = useSite();
  const connection = useClassroom(classroom !== null);
  return (
    <SharedClassroomContext.Provider value={connection}>
      {children}
    </SharedClassroomContext.Provider>
  );
}
