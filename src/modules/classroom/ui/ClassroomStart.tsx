import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { Alert, Badge, Button } from "@chromatis/base/ui";
import { postClassroom, useClassroom } from "../application/useClassroom";
import { useSite } from "./SiteContext";
import TEXT from "./classroom.de.json";
import "./quiz.css";

/**
 * The teacher's Classroom: starts a session and shows the join code and
 * who is connected. The Controller Token stays in an HttpOnly cookie.
 */
export function ClassroomStart({ courseId }: { courseId: string }) {
  const { classroom } = useSite();
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { snapshot } = useClassroom(classroom?.role === "controller");
  // The address is only known in the browser; the server renders the path.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function run(body: unknown) {
    setBusy(true);
    setFailed(false);
    const ok = await postClassroom(body);
    setFailed(!ok);
    setBusy(false);
    if (ok) {
      await revalidator.revalidate();
    }
  }

  async function end() {
    if (!window.confirm(TEXT.start.endConfirm)) {
      return;
    }
    setBusy(true);
    const ended = await postClassroom({
      intent: "act",
      payload: { type: "end" },
    });
    await postClassroom({ intent: "leave" });
    setBusy(false);
    setFailed(!ended);
    await revalidator.revalidate();
  }

  if (!classroom || classroom.role !== "controller") {
    return (
      <section aria-labelledby="classroom-start" className="classroom-start">
        <h2 id="classroom-start" className="h2">
          {TEXT.start.title}
        </h2>
        <p>{TEXT.start.idle}</p>
        <Button
          disabled={busy}
          onClick={() => void run({ intent: "create", courseId })}
        >
          {busy ? TEXT.start.starting : TEXT.start.start}
        </Button>
        {failed && <Alert status="error">{TEXT.start.failed}</Alert>}
      </section>
    );
  }

  const joinLink = `${origin}/join/${classroom.code}`;
  const roster = snapshot?.role === "controller" ? snapshot.participants : [];
  const connected = roster.filter((participant) => participant.connected);
  return (
    <section aria-labelledby="classroom-start" className="classroom-start">
      <h2 id="classroom-start" className="h2">
        {TEXT.start.title}
      </h2>
      <p>{TEXT.start.code}</p>
      <p className="classroom-start__code" aria-label={classroom.code}>
        {[...classroom.code].join(" ")}
      </p>
      <p className="muted">
        {TEXT.start.link}: <a href={joinLink}>{joinLink}</a>
      </p>
      <p>
        <Badge status="info">
          {snapshot ? connected.length : TEXT.start.connecting}{" "}
          {snapshot ? TEXT.start.participants : ""}
        </Badge>
      </p>
      {roster.length > 0 && (
        <ul className="classroom-start__roster">
          {roster.map((participant) => (
            <li key={participant.id}>
              {participant.name}
              {!participant.connected && (
                <span className="muted"> ({TEXT.start.offline})</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Button role="secondary" disabled={busy} onClick={() => void end()}>
        {TEXT.start.end}
      </Button>
      {failed && <Alert status="error">{TEXT.start.failed}</Alert>}
    </section>
  );
}
