import type { EmitterWebhookEvent as WebhookEvent } from "@octokit/webhooks";

import { Context } from "../context.js";
import type { State } from "../types.js";

/**
 * Octotask's transform option, which extends the `event` object that is passed
 * to webhook event handlers by `@octokit/webhooks`
 * @see https://github.com/octokit/webhooks.js/#constructor
 */
export async function webhookTransform(state: State, event: WebhookEvent) {
  const log = state.log.child({ name: "event", id: event.id });
  const octokit = (await state.octokit.auth({
    type: "event-octokit",
    event,
  })) as typeof state.octokit;
  return new Context(event, octokit, log);
}
