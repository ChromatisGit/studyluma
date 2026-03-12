import "server-only";

import { Rest } from "ably";

let _rest: Rest | null = null;

function getRest(): Rest {
  if (!_rest) {
    if (!process.env.ABLY_API_KEY) throw new Error("ABLY_API_KEY is not set");
    _rest = new Rest({ key: process.env.ABLY_API_KEY });
  }
  return _rest;
}

export function getAblyRest(): Rest {
  return getRest();
}

/**
 * Publish an event to an Ably channel. The event's `type` field is used as
 * the Ably message name so subscribers can filter by event type.
 * Errors are swallowed — DB is the source of truth; realtime is best-effort.
 */
export async function publishToChannel(channel: string, data: unknown): Promise<void> {
  try {
    const name = (data as { type: string }).type;
    await getRest().channels.get(channel).publish(name, data);
  } catch (error) {
    // Non-fatal: clients will pick up state on next poll
    console.error("[Ably] publish failed on channel", channel, error);
  }
}
