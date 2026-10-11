import type { ActionFunctionArgs } from "react-router";
import { checkSubmitted, checkSubmittedStep } from "../answer.server";

/** Checks one answer against the private catalog; only its answer travels. */
export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const buildId = form.get("buildId"),
    partId = form.get("partId"),
    raw = form.get("answer");
  if (
    typeof buildId !== "string" ||
    typeof partId !== "string" ||
    typeof raw !== "string" ||
    raw.length > 10000
  ) {
    throw new Response(null, { status: 400 });
  }
  let answer: unknown;
  try {
    answer = JSON.parse(raw);
  } catch {
    throw new Response(null, { status: 400 });
  }
  const stepId = form.get("stepId");
  const result =
    form.get("kind") === "step" && typeof stepId === "string"
      ? checkSubmittedStep(buildId, partId, stepId, answer)
      : checkSubmitted(buildId, partId, answer);
  if (!result) {
    throw new Response(null, { status: 404 });
  }
  return Response.json(result);
}
