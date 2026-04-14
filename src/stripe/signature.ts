import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = 300;

export type StripeSignatureParts = {
  timestamp: number;
  signatures: string[];
};

export const parseStripeSignature = (signatureHeader: string): StripeSignatureParts => {
  const parts = signatureHeader.split(",");
  let timestamp: number | undefined;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=", 2);

    if (key === "t" && value) {
      timestamp = Number(value);
    }

    if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  if (!timestamp || Number.isNaN(timestamp)) {
    throw new Error("Stripe signature header is missing a timestamp.");
  }

  if (signatures.length === 0) {
    throw new Error("Stripe signature header is missing a v1 signature.");
  }

  return { timestamp, signatures };
};

export const computeStripeSignature = (
  payload: Buffer | string,
  timestamp: number,
  secret: string,
): string => {
  const signedPayload = `${timestamp}.${Buffer.isBuffer(payload) ? payload.toString("utf8") : payload}`;

  return createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
};

const secureCompare = (expected: string, actual: string): boolean => {
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
};

export const verifyStripeSignature = ({
  payload,
  signatureHeader,
  secret,
  now = Math.floor(Date.now() / 1000),
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
}: {
  payload: Buffer;
  signatureHeader: string | undefined;
  secret: string;
  now?: number;
  toleranceSeconds?: number;
}): void => {
  if (!signatureHeader) {
    throw new Error("Missing Stripe-Signature header.");
  }

  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  const age = Math.abs(now - timestamp);

  if (age > toleranceSeconds) {
    throw new Error("Stripe signature timestamp is outside the tolerance window.");
  }

  const expectedSignature = computeStripeSignature(payload, timestamp, secret);
  const isValid = signatures.some((signature) => secureCompare(expectedSignature, signature));

  if (!isValid) {
    throw new Error("Stripe signature verification failed.");
  }
};
