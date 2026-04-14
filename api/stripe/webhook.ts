import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "../../src/config/env.js";
import { dispatchJaredEvent } from "../../src/handlers/dispatch.js";
import { readRawBody } from "../../src/http/raw-body.js";
import { SlackApiClient } from "../../src/slack/client.js";
import { parseStripeEvent, toJaredStripeEvent } from "../../src/stripe/events.js";
import { verifyStripeSignature } from "../../src/stripe/signature.js";

const getHeader = (req: IncomingMessage, name: string): string | undefined => {
  const value = req.headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

const sendJson = (res: ServerResponse, statusCode: number, body: unknown): void => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let config;

  try {
    config = loadConfig();
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Server is not configured" });
    return;
  }

  let rawBody: Buffer;

  try {
    rawBody = await readRawBody(req);
    verifyStripeSignature({
      payload: rawBody,
      signatureHeader: getHeader(req, "stripe-signature"),
      secret: config.stripeWebhookSecret,
    });
  } catch (error) {
    console.warn(error);
    sendJson(res, 400, { error: "Invalid Stripe webhook signature" });
    return;
  }

  try {
    const stripeEvent = parseStripeEvent(rawBody);
    const jaredEvent = toJaredStripeEvent(stripeEvent);

    if (!jaredEvent) {
      sendJson(res, 200, { received: true, ignored: true });
      return;
    }

    await dispatchJaredEvent({
      config,
      event: jaredEvent,
      slack: new SlackApiClient(config.slackBotToken),
    });

    sendJson(res, 200, { received: true });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Webhook processing failed" });
  }
}
