import type { Worksheet } from "../application/queries";
import { Form, useActionData, useLoaderData } from "react-router";
import { MarkdownRenderer } from "../../content";

export default function WorksheetPage() {
  const { worksheet, answer } = useLoaderData<{
    worksheet: Worksheet;
    answer: string;
  }>();
  const result = useActionData<{ ok: boolean; error?: string }>();
  return (
    <main>
      <h1>{worksheet.title}</h1>
      <div className="card">
        <MarkdownRenderer markdown={worksheet.body} />
      </div>
      <div className="card">
        <Form method="post">
          <label>
            <span>Meine Antwort</span>
            <textarea
              name="answer"
              rows={8}
              defaultValue={answer}
              key={answer}
            />
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
      </div>
    </main>
  );
}
