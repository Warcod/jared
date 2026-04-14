import type { StripeChargeSucceededEvent } from "../events/types.js";

type StripeEvent = {
  id: string;
  type: string;
  created: number;
  livemode: boolean;
  data?: {
    object?: unknown;
  };
};

type StripeCharge = {
  id?: unknown;
  amount?: unknown;
  billing_details?: {
    email?: unknown;
  };
  currency?: unknown;
  customer?: unknown;
  description?: unknown;
  metadata?: unknown;
  payment_intent?: unknown;
  receipt_email?: unknown;
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

export const toJaredStripeEvent = (event: StripeEvent): StripeChargeSucceededEvent | undefined => {
  if (event.type !== "charge.succeeded") {
    return undefined;
  }

  const charge = event.data?.object as StripeCharge | undefined;

  if (!charge || typeof charge !== "object") {
    throw new Error("charge.succeeded event is missing a charge object.");
  }

  const chargeId = asString(charge.id);
  const amount = asNumber(charge.amount);
  const currency = asString(charge.currency);

  if (!chargeId || amount === undefined || !currency) {
    throw new Error("charge.succeeded event is missing required charge fields.");
  }

  return {
    type: "stripe.charge_succeeded",
    payload: {
      amount,
      chargeId,
      currency,
      customerId: asString(charge.customer),
      customerEmail: asString(charge.billing_details?.email),
      description: asString(charge.description),
      livemode: event.livemode,
      metadata: asMetadata(charge.metadata),
      paymentIntentId: asString(charge.payment_intent),
      receiptEmail: asString(charge.receipt_email),
      stripeEventId: event.id,
      created: event.created,
    },
  };
};
