import { useState, type FormEvent } from "react";
import { Alert, Button, Input, Page, PageHeader } from "@chromatis/base/ui";
import { normalizeJoinCode } from "../domain/joinCode";
import { CLASSROOM_PATH } from "../application/useClassroom";
import TEXT from "./classroom.de.json";
import "./quiz.css";

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

/** Students join a Classroom Session with its code and a name, no account. */
export function JoinPage({
  initialCode = "",
  coursesPath,
}: {
  initialCode?: string;
  coursesPath: string;
}) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [name, setName] = useState("");
  const [failure, setFailure] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const valid = normalizeJoinCode(code) !== null && name.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || busy) {
      return;
    }
    setBusy(true);
    const result = await join(code, name);
    if (result === null) {
      // A full load, so every page sees the new Classroom cookie.
      window.location.assign(coursesPath);
      return;
    }
    setFailure(result);
    setBusy(false);
  }

  return (
    <Page title={TEXT.join.title} width="content">
      <PageHeader title={TEXT.join.title} />
      <p>{TEXT.join.intro}</p>
      <form onSubmit={submit} className="classroom-join">
        <Input
          label={TEXT.join.code}
          hint={TEXT.join.codeHint}
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
          maxLength={40}
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
