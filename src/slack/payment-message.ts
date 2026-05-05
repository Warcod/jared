import type { StripeChargeFailedPayload, StripeChargePayload } from "../events/types.js";

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
    "Nuevo pago recibido :mario-coin:",
    "",
    `Amount: ${formatMoney(payload.amount, payload.currency)}`,
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

const getReasonLine = (payload: StripeChargeFailedPayload): string | undefined => {
  if (payload.failureMessage && payload.failureCode) {
    return `Reason: ${payload.failureMessage} (${payload.failureCode})`;
  }

  if (payload.failureMessage) {
    return `Reason: ${payload.failureMessage}`;
  }

  if (payload.failureCode) {
    return `Reason: ${payload.failureCode}`;
  }

  return undefined;
};

export const buildChargeFailedSlackMessage = (payload: StripeChargeFailedPayload): string => {
  const metadataLine = getMetadataLine(payload.metadata);
  const reasonLine = getReasonLine(payload);
  const lines = [
    "Pago fallido :x:",
    "",
    `Amount: ${formatMoney(payload.amount, payload.currency)}`,
  ];

  if (payload.paymentIntentId) {
    lines.push(`PaymentIntent: ${payload.paymentIntentId}`);
  }

  if (payload.description) {
    lines.push(`Description: ${payload.description}`);
  }

  if (reasonLine) {
    lines.push(reasonLine);
  }

  if (metadataLine) {
    lines.push(`Metadata: ${metadataLine}`);
  }

  return lines.join("\n");
};
