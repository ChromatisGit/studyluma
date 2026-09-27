import { useEffect, useState } from "react";
import type { Worksheet } from "../application/queries";
import { parseWorksheet, type Exercise } from "../application/parseWorksheet";
import { readAnswers } from "../application/answers";
import { Form, Link, useActionData, useLoaderData } from "react-router";
import {
  GapMarkdownRenderer,
  GapRenderProvider,
  MarkdownRenderer,
} from "../../content";

function ExerciseView({
  exercise,
  value,
  onChange,
  completed,
}: {
  exercise: Exercise;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  completed: boolean;
}) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="card worksheet-exercise">
      {exercise.kind === "gap" ? (
        <GapRenderProvider
          renderGap={(index) => (
            <select
              aria-label={`Lücke ${index + 1}`}
              value={selected[index] ?? ""}
              onChange={(event) => {
                const next = [...selected];
                next[index] = event.target.value;
                onChange(next);
              }}
            >
              <option value="">Bitte wählen</option>
              {exercise.gaps[index]?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        >
          <GapMarkdownRenderer markdown={exercise.prompt} />
        </GapRenderProvider>
      ) : (
        <MarkdownRenderer markdown={exercise.prompt} />
      )}
      {(exercise.kind === "single-choice" || exercise.kind === "mcq") && (
        <fieldset>
          <legend>Antwort auswählen</legend>
          {exercise.options.map((option, index) => (
            <label className="worksheet-option" key={index}>
              <input
                type={exercise.kind === "mcq" ? "checkbox" : "radio"}
                name={`exercise-${exercise.id}`}
                checked={
                  exercise.kind === "mcq"
                    ? selected.includes(String(index))
                    : value === String(index)
                }
                onChange={(event) => {
                  if (exercise.kind === "mcq") {
                    onChange(
                      event.target.checked
                        ? [...selected, String(index)]
                        : selected.filter((item) => item !== String(index)),
                    );
                  } else {
                    onChange(String(index));
                  }
                }}
              />
              <MarkdownRenderer markdown={option} />
            </label>
          ))}
        </fieldset>
      )}
      {exercise.kind === "input" && (
        <label>
          <span>Meine Antwort</span>
          <input
            aria-label={`Antwort ${Number(exercise.id) + 1}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      )}
      {exercise.kind === "task" && (
        <label>
          <span>Meine Lösung</span>
          <textarea
            rows={5}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      )}
      {exercise.hint && (
        <details>
          <summary>Hinweis</summary>
          <MarkdownRenderer markdown={exercise.hint} />
        </details>
      )}
      {completed && exercise.why && (
        <details>
          <summary>Erklärung</summary>
          <MarkdownRenderer markdown={exercise.why} />
        </details>
      )}
    </div>
  );
}

export default function WorksheetPage() {
  const { worksheet, answer } = useLoaderData<{
    worksheet: Worksheet;
    answer: string;
  }>();
  const result = useActionData<{
    ok: boolean;
    completed?: boolean;
    error?: string;
  }>();
  return (
    <WorksheetContent
      key={`${worksheet.id}:${answer}`}
      worksheet={worksheet}
      answer={answer}
      result={result}
    />
  );
}

function WorksheetContent({
  worksheet,
  answer,
  result,
}: {
  worksheet: Worksheet;
  answer: string;
  result: { ok: boolean; completed?: boolean; error?: string } | undefined;
}) {
  const [state, setState] = useState(() => readAnswers(answer));
  useEffect(() => {
    if (result?.ok && result.completed) {
      setState((current) => ({ ...current, completed: true }));
    }
  }, [result]);
  const exercises = parseWorksheet(worksheet.body);
  const chapterUrl =
    worksheet.course_id && worksheet.topic_id
      ? `/courses/${encodeURIComponent(worksheet.course_id)}/topics/${encodeURIComponent(worksheet.topic_id)}/chapters/${encodeURIComponent(worksheet.chapter_id)}`
      : undefined;

  function update(id: string, value: string | string[]) {
    setState((current) => ({
      ...current,
      completed: false,
      responses: { ...current.responses, [id]: value },
    }));
  }

  return (
    <main>
      {chapterUrl && (
        <p>
          <Link to={chapterUrl}>← Zurück zum Kapitel</Link>
        </p>
      )}
      <h1>{worksheet.title}</h1>
      {exercises.length ? (
        <Form method="post">
          {exercises.map((exercise, index) => (
            <div key={exercise.id}>
              {(index === 0 ||
                exercises[index - 1]?.section !== exercise.section) && (
                <h2>{exercise.section}</h2>
              )}
              <ExerciseView
                exercise={exercise}
                value={state.responses[exercise.id]}
                onChange={(value) => update(exercise.id, value)}
                completed={state.completed}
              />
            </div>
          ))}
          <input type="hidden" name="answer" value={JSON.stringify(state)} />
          {result?.ok && (
            <p className="success" role="status">
              Antworten gespeichert.
            </p>
          )}
          {result && !result.ok && (
            <p className="error" role="alert">
              {result.error}
            </p>
          )}
          {state.completed && (
            <p className="success" role="status">
              Arbeitsblatt abgeschlossen.
            </p>
          )}
          <button type="submit">Speichern</button>{" "}
          <button type="submit" name="intent" value="complete">
            Abschließen
          </button>
        </Form>
      ) : (
        <>
          <div className="card">
            <MarkdownRenderer markdown={worksheet.body} />
          </div>
          <Form method="post" className="card">
            <label>
              <span>Meine Antwort</span>
              <textarea name="answer" rows={8} defaultValue={answer} />
            </label>
            {result?.ok && (
              <p className="success" role="status">
                Antwort gespeichert.
              </p>
            )}
            {result && !result.ok && (
              <p className="error" role="alert">
                {result.error}
              </p>
            )}
            <button type="submit">Speichern</button>
          </Form>
        </>
      )}
    </main>
  );
}
