import { useEffect, useState, type FormEvent } from "react";
import { Alert, Button, Input, Page, PageHeader } from "@chromatis/base/ui";
import { normalizeJoinCode } from "../domain/joinCode";
import { CLASSROOM_PATH } from "../application/useClassroom";
import { fill } from "../../../helper/text";
import TEXT from "./classroom.de.json";
import "./quiz.css";
import "./join.css";

type Failure = "unknown" | "tooMany" | "full" | "failed";

async function join(code: string, name: string): Promise<Failure | null> {
  try {
    const response = await fetch(CLASSROOM_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "join", code, name }),
    });
    if (response.ok) {
      return null;
    }
    return response.status === 404
      ? "unknown"
      : response.status === 429
        ? "tooMany"
        : response.status === 409
          ? "full"
          : "failed";
  } catch {
    return "failed";
  }
}

/** How long the success moment stays before the device moves on. */
const WELCOME_MS = 2200;
const WELCOME_REDUCED_MS = 900;

/**
 * The moment after joining: a check mark drawn as with chalk on the board,
 * then the name. No dialog to dismiss; the device moves on by itself.
 */
function Welcome({ name, next }: { name: string; next: string }) {
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // A full load, so every page sees the new Classroom cookie.
    const timer = setTimeout(
      () => window.location.assign(next),
      reduced ? WELCOME_REDUCED_MS : WELCOME_MS,
    );
    return () => clearTimeout(timer);
  }, [next]);
  return (
    <main className="join-welcome" role="status">
      <div className="join-welcome__board">
        <svg
          className="join-welcome__check"
          viewBox="0 0 120 100"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="join-chalk"
              x="-10%"
              y="-10%"
              width="120%"
              height="120%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.9"
                numOctaves="2"
                seed="3"
              />
              <feDisplacementMap in="SourceGraphic" scale="3" />
            </filter>
          </defs>
          <path
            d="M14 54 C 24 60, 34 70, 44 82 C 60 56, 82 30, 108 12"
            pathLength="1"
            filter="url(#join-chalk)"
          />
        </svg>
        <p className="join-welcome__name">
          {fill(TEXT.device.joined, { name })}
        </p>
      </div>
    </main>
  );
}

/** Students join a Classroom Session with its code and a name, no account. */
export function JoinPage({
  initialCode = "",
  nextPath,
  maxNameLength,
}: {
  initialCode?: string;
  /** Where the device goes once it has joined: the calm view. */
  nextPath: string;
  /** The longest name the session accepts. */
  maxNameLength: number;
}) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState<string | null>(null);
  const valid = normalizeJoinCode(code) !== null && name.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    const result = await join(code, name);
    if (result === null) {
      setJoined(name.replace(/\s+/g, " ").trim());
      return;
    }
    setFailure(result);
    setBusy(false);
  }

  if (joined !== null) {
    return <Welcome name={joined} next={nextPath} />;
  }

  return (
    <Page title={TEXT.join.title} width="content">
      <PageHeader title={TEXT.join.title} />
      <p>{TEXT.join.intro}</p>
      <form onSubmit={submit} className="classroom-join">
        <Input
          label={TEXT.join.code}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          maxLength={4}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
        />
        <Input
          label={TEXT.join.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={maxNameLength}
          autoComplete="given-name"
        />
        {failure && <Alert status="error">{TEXT.join[failure]}</Alert>}
        <Button type="submit" disabled={!valid || busy}>
          {TEXT.join.submit}
        </Button>
      </form>
    </Page>
  );
}
