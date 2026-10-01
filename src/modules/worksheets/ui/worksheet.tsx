import { useState } from "react";
import type { Worksheet } from "../application/queries";
import { parseWorksheet, type Exercise } from "../application/parseWorksheet";
import { readAnswers } from "../application/answers";
import { Form, useActionData, useLoaderData } from "react-router";
import {
  Alert,
  Breadcrumbs,
  Button,
  Card,
  CardBody,
  Input,
  Page,
  PageHeader,
  Select,
  TextAreaField,
} from "@chromatis/base/ui";
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
    <Card className="worksheet-exercise">
      <CardBody>
        {exercise.kind === "gap" ? (
          <GapRenderProvider
            renderGap={(index) => (
              <Select
                label={`Lücke ${index + 1}`}
                options={[
                  { value: "", label: "Bitte wählen" },
                  ...(exercise.gaps[index] ?? []).map((option) => ({
                    value: option,
                    label: option,
                  })),
                ]}
                value={selected[index] ?? ""}
                onChange={(event) => {
                  const next = [...selected];
                  next[index] = event.target.value;
                  onChange(next);
                }}
              />
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
          <Input
            label="Meine Antwort"
            aria-label={`Antwort ${Number(exercise.id) + 1}`}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        {exercise.kind === "task" && (
          <TextAreaField
            label="Meine Lösung"
            rows={5}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        <ExerciseHelp exercise={exercise} completed={completed} />
      </CardBody>
    </Card>
  );
}

function ExerciseHelp({
  exercise,
  completed,
}: {
  exercise: Exercise;
  completed: boolean;
}) {
  return (
    <>
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
    </>
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
    <Page title={worksheet.title} className="worksheet-page">
      <PageHeader
        title={worksheet.title}
        breadcrumbs={
          chapterUrl && (
            <Breadcrumbs
              label="Brotkrumennavigation"
              items={[
                { label: "Kapitel", to: chapterUrl },
                { label: worksheet.title },
              ]}
            />
          )
        }
      />
      {worksheet.is_locked ? (
        <Alert status="warning">Dieses Arbeitsblatt ist gesperrt.</Alert>
      ) : exercises.length ? (
        <Form method="post" className="stack stack-600 worksheet-form">
          {exercises.map((exercise, index) => (
            <div className="worksheet-section" key={exercise.id}>
              {(index === 0 ||
                exercises[index - 1]?.section !== exercise.section) && (
                <h2 className="worksheet-section__heading">
                  {exercise.section}
                </h2>
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
          {result?.ok && <Alert status="success">Antworten gespeichert.</Alert>}
          {result && !result.ok && <Alert status="error">{result.error}</Alert>}
          {state.completed && (
            <Alert status="success">Arbeitsblatt abgeschlossen.</Alert>
          )}
          <div className="btn-group worksheet-actions">
            <Button type="submit">Speichern</Button>
            <Button
              type="submit"
              role="secondary"
              name="intent"
              value="complete"
            >
              Abschließen
            </Button>
          </div>
        </Form>
      ) : (
        <>
          <Card>
            <CardBody>
              <MarkdownRenderer markdown={worksheet.body} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Form method="post" className="stack stack-600">
                <TextAreaField
                  label="Meine Antwort"
                  name="answer"
                  rows={8}
                  defaultValue={answer}
                />
                {result?.ok && (
                  <Alert status="success">Antwort gespeichert.</Alert>
                )}
                {result && !result.ok && (
                  <Alert status="error">{result.error}</Alert>
                )}
                <Button type="submit">Speichern</Button>
              </Form>
            </CardBody>
          </Card>
        </>
      )}
    </Page>
  );
}
