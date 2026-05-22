type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

export async function postSlideAction<T = unknown>(
  payload: Record<string, unknown>,
): Promise<ActionResult<T>> {
  const response = await fetch("/api/slides", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json() as Promise<ActionResult<T>>;
}
