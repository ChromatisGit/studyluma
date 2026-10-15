import type { ReactNode } from "react";
import {
  SharedClassroomContext,
  useClassroom,
} from "../application/useClassroom";
import { useSite } from "./SiteContext";

/** The controller's page opens one connection to its session for everything below. */
export function ClassroomConnection({ children }: { children: ReactNode }) {
  const { classroom } = useSite();
  const connection = useClassroom(classroom?.role === "controller");
  return (
    <SharedClassroomContext.Provider value={connection}>
      {children}
    </SharedClassroomContext.Provider>
  );
}
