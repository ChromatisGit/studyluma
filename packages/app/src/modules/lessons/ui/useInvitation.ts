import { useEffect, useMemo, useState } from "react";
import { useSharedClassroom, useSite } from "../../classroom";
import type { JoinInfo } from "../infrastructure/projectorChannel";
import type { InviteState } from "./LessonHeader";

/** The invitation: what the header offers and what the projector is told. */
export function useInvitation(
  sendJoin: (join: JoinInfo | null) => void,
): InviteState | null {
  const site = useSite();
  const controller = site.classroom?.role === "controller";
  const { snapshot, send } = useSharedClassroom(controller);
  const [shown, setShown] = useState(false);
  // This instance's address is only known in the browser; the server renders the path.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const view = snapshot?.role === "controller" ? snapshot : null;
  const open = !!view?.inviteOpen;
  const code = view?.code ?? null;
  const joined =
    view?.participants.filter((item) => item.connected).length ?? 0;
  const base = site.joinOrigin ?? origin;
  const join = useMemo<JoinInfo | null>(
    () =>
      shown && open && code && base
        ? {
            code,
            address: `${base.replace(/^https?:\/\//, "")}/${code}`,
            url: `${base}/${code}`,
            count: joined,
          }
        : null,
    [shown, open, code, base, joined],
  );
  useEffect(() => sendJoin(join), [join, sendJoin]);
  if (!controller) {
    return null;
  }
  return {
    open,
    code,
    joined,
    onShownProjector: shown && open,
    onInvite: () => {
      setShown(true);
      void send({ type: "invite" });
    },
    onToggleProjector: () => setShown(!shown),
    join,
  };
}
