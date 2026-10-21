import { useEffect } from "react";
import type { Phase } from "../domain/session";
import { useSite } from "../ui/SiteContext";
import { useSharedClassroom } from "./useClassroom";

/**
 * The teacher's browser tells the session what the students do now. Only a
 * change is sent: the session's own phase is the one to compare with.
 */
export function useSendPhase(phase: Phase | null) {
  const { classroom } = useSite();
  const { snapshot, send } = useSharedClassroom(
    classroom?.role === "controller",
  );
  const current = snapshot?.role === "controller" ? snapshot.phase : null;
  useEffect(() => {
    if (phase && current && current !== phase) {
      void send({ type: "phase", phase });
    }
  }, [phase, current, send]);
}
