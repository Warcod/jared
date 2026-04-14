import type { StripeChargePayload } from "../events/types.js";

const formatMoney = (amountInMinorUnits: number, currency: string): string => {
  const normalizedCurrency = currency.toUpperCase();

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
    }).format(amountInMinorUnits / 100);
  } catch {
    return `${normalizedCurrency} ${(amountInMinorUnits / 100).toFixed(2)}`;
  }
};

const getMetadataLine = (metadata: Record<string, string>): string | undefined => {
  const keys = ["commetCustomerId", "externalId", "organizationId", "plan", "product"];
  const entries = keys
    .map((key) => [key, metadata[key]] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));

  if (entries.length === 0) {
    return undefined;
  }

  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
};

export const buildChargeSucceededSlackMessage = (payload: StripeChargePayload): string => {
  const customer = payload.customerEmail ?? payload.receiptEmail ?? payload.customerId ?? "Unknown";
  const mode = payload.livemode ? "live" : "test";
  const metadataLine = getMetadataLine(payload.metadata);
  const lines = [
    "New charge succeeded",
    "",
    `Amount: ${formatMoney(payload.amount, payload.currency)}`,
    `Customer: ${customer}`,
    `Charge: ${payload.chargeId}`,
    `Stripe event: ${payload.stripeEventId}`,
    `Mode: ${mode}`,
  ];

  if (payload.paymentIntentId) {
    lines.push(`PaymentIntent: ${payload.paymentIntentId}`);
  }

  if (payload.description) {
    lines.push(`Description: ${payload.description}`);
  }

  if (metadataLine) {
    lines.push(`Metadata: ${metadataLine}`);
  }

  return lines.join("\n");
};
