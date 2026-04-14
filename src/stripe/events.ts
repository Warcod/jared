import type { StripePaymentSucceededEvent } from "../events/types.js";

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  data?: {
    object?: unknown;
  };
};

type StripePaymentIntent = {
  id?: unknown;
  amount_received?: unknown;
  amount?: unknown;
  currency?: unknown;
  customer?: unknown;
  receipt_email?: unknown;
  description?: unknown;
  metadata?: unknown;
  charges?: {
    data?: Array<{
      billing_details?: {
        email?: unknown;
      };
      receipt_email?: unknown;
    }>;
  };
};

export const parseStripeEvent = (payload: Buffer): StripeEvent => {
  const parsed = JSON.parse(payload.toString("utf8")) as unknown;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Stripe webhook payload must be a JSON object.");
  }

  const event = parsed as Partial<StripeEvent>;

  if (typeof event.id !== "string" || typeof event.type !== "string") {
    throw new Error("Stripe webhook payload is missing required event fields.");
  }

  if (typeof event.created !== "number" || typeof event.livemode !== "boolean") {
    throw new Error("Stripe webhook payload is missing required metadata fields.");
  }

  return event as StripeEvent;
};

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

const asNumber = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);

const asMetadata = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
};

const getChargeEmail = (paymentIntent: StripePaymentIntent): string | undefined => {
  const charge = paymentIntent.charges?.data?.[0];

  return asString(charge?.billing_details?.email) ?? asString(charge?.receipt_email);
};

export const toJaredStripeEvent = (event: StripeEvent): StripePaymentSucceededEvent | undefined => {
  if (event.type !== "payment_intent.succeeded") {
    return undefined;
  }

  const paymentIntent = event.data?.object as StripePaymentIntent | undefined;

  if (!paymentIntent || typeof paymentIntent !== "object") {
    throw new Error("payment_intent.succeeded event is missing a payment intent object.");
  }

  const paymentIntentId = asString(paymentIntent.id);
  const amount = asNumber(paymentIntent.amount_received) ?? asNumber(paymentIntent.amount);
  const currency = asString(paymentIntent.currency);

  if (!paymentIntentId || amount === undefined || !currency) {
    throw new Error("payment_intent.succeeded event is missing required payment fields.");
  }

  return {
    type: "stripe.payment_succeeded",
    payload: {
      amount,
      currency,
      customerId: asString(paymentIntent.customer),
      customerEmail: getChargeEmail(paymentIntent),
      description: asString(paymentIntent.description),
      livemode: event.livemode,
      metadata: asMetadata(paymentIntent.metadata),
      paymentIntentId,
      receiptEmail: asString(paymentIntent.receipt_email),
      stripeEventId: event.id,
      created: event.created,
    },
  };
};
