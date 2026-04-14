import { describe, expect, it } from "vitest";
import { computeStripeSignature, verifyStripeSignature } from "../src/stripe/signature.js";

describe("Stripe signature verification", () => {
  it("accepts a valid Stripe signature", () => {
    const payload = Buffer.from(JSON.stringify({ id: "evt_123" }));
    const secret = "whsec_test";
    const timestamp = 1_700_000_000;
    const signature = computeStripeSignature(payload, timestamp, secret);

    expect(() =>
      verifyStripeSignature({
        payload,
        signatureHeader: `t=${timestamp},v1=${signature}`,
        secret,
        now: timestamp,
      }),
    ).not.toThrow();
  });

  it("rejects an invalid Stripe signature", () => {
    const payload = Buffer.from(JSON.stringify({ id: "evt_123" }));
    const timestamp = 1_700_000_000;

    expect(() =>
      verifyStripeSignature({
        payload,
        signatureHeader: `t=${timestamp},v1=${"0".repeat(64)}`,
        secret: "whsec_test",
        now: timestamp,
      }),
    ).toThrow("Stripe signature verification failed.");
  });
});
