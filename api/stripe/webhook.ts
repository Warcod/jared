import type { IncomingMessage, ServerResponse } from "node:http";
import { loadConfig } from "../../src/config/env.js";
import { dispatchJaredEvent } from "../../src/handlers/dispatch.js";
import { readRawBody } from "../../src/http/raw-body.js";
import { SlackApiClient, SlackApiError } from "../../src/slack/client.js";
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

const logWebhookInfo = (stage: string, context: Record<string, unknown> = {}): void => {
  console.info(
    JSON.stringify({
      scope: "stripe_webhook",
      stage,
      ...context,
    }),
  );
};

const describeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof SlackApiError) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      slackError: error.slackError,
      statusCode: error.statusCode,
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      cause: error.cause instanceof Error ? error.cause.message : undefined,
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: String(error),
  };
};

const logWebhookError = (stage: string, error: unknown, context: Record<string, unknown> = {}): void => {
  console.error(
    JSON.stringify({
      scope: "stripe_webhook",
      stage,
      ...context,
      ...describeError(error),
    }),
  );
};

const getRequestContext = (req: IncomingMessage): Record<string, unknown> => ({
  contentLength: getHeader(req, "content-length"),
  requestMethod: req.method,
  stripeSignaturePresent: Boolean(getHeader(req, "stripe-signature")),
  userAgent: getHeader(req, "user-agent"),
  vercelRequestId: getHeader(req, "x-vercel-id"),
});

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const requestContext = getRequestContext(req);

  logWebhookInfo("received_request", requestContext);

  let config;

  try {
    config = loadConfig();
  } catch (error) {
    logWebhookError("load_config", error, requestContext);
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
    logWebhookError("verify_signature", error, requestContext);
    sendJson(res, 400, { error: "Invalid Stripe webhook signature" });
    return;
  }

  let stripeEvent;

  try {
    stripeEvent = parseStripeEvent(rawBody);
    logWebhookInfo("parsed_event", {
      ...requestContext,
      livemode: stripeEvent.livemode,
      stripeEventCreated: stripeEvent.created,
      stripeEventId: stripeEvent.id,
      stripeEventType: stripeEvent.type,
    });
  } catch (error) {
    logWebhookError("parse_event", error, requestContext);
    sendJson(res, 400, { error: "Invalid Stripe webhook payload" });
    return;
  }

  let jaredEvent;

  try {
    jaredEvent = toJaredStripeEvent(stripeEvent);
  } catch (error) {
    logWebhookError("normalize_event", error, {
      ...requestContext,
      stripeEventId: stripeEvent.id,
      stripeEventType: stripeEvent.type,
    });
    sendJson(res, 500, { error: "Webhook processing failed" });
    return;
  }

  if (!jaredEvent) {
    logWebhookInfo("ignored_event", {
      ...requestContext,
      stripeEventId: stripeEvent.id,
      stripeEventType: stripeEvent.type,
    });
    sendJson(res, 200, { received: true, ignored: true });
    return;
  }

  try {
    await dispatchJaredEvent({
      config,
      event: jaredEvent,
      slack: new SlackApiClient(config.slackBotToken),
    });
  } catch (error) {
    logWebhookError("dispatch_event", error, {
      ...requestContext,
      stripeEventId: stripeEvent.id,
      stripeEventType: stripeEvent.type,
      jaredEventType: jaredEvent.type,
    });
    sendJson(res, 500, { error: "Webhook processing failed" });
    return;
  }

  logWebhookInfo("dispatched_event", {
    ...requestContext,
    jaredEventType: jaredEvent.type,
    livemode: stripeEvent.livemode,
    stripeEventId: stripeEvent.id,
    stripeEventType: stripeEvent.type,
  });

  sendJson(res, 200, { received: true });
}
