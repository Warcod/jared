import { describe, expect, it } from "vitest";
import { parseStripeEvent, toJaredStripeEvent } from "../src/stripe/events.js";

describe("Stripe event normalization", () => {
  it("normalizes charge.succeeded into a Jared event", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_123",
          type: "charge.succeeded",
          created: 1_700_000_000,
          livemode: false,
          data: {
            object: {
              id: "ch_123",
              amount: 4900,
              currency: "usd",
              customer: "cus_123",
              billing_details: {
                email: "buyer@example.com",
              },
              payment_intent: "pi_123",
              receipt_email: "buyer@example.com",
              metadata: {
                organizationId: "org_123",
                ignoredNumber: 123,
              },
            },
          },
        }),
      ),
    );

    expect(toJaredStripeEvent(stripeEvent)).toEqual({
      type: "stripe.charge_succeeded",
      payload: {
        amount: 4900,
        chargeId: "ch_123",
        currency: "usd",
        customerId: "cus_123",
        customerEmail: "buyer@example.com",
        description: undefined,
        livemode: false,
        metadata: {
          organizationId: "org_123",
        },
        paymentIntentId: "pi_123",
        receiptEmail: "buyer@example.com",
        stripeEventId: "evt_123",
        created: 1_700_000_000,
      },
    });
  });

  it("normalizes charge.failed with failure_code and failure_message", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_456",
          type: "charge.failed",
          created: 1_700_000_001,
          livemode: true,
          data: {
            object: {
              id: "ch_456",
              amount: 1500,
              currency: "usd",
              customer: "cus_456",
              billing_details: { email: "buyer@example.com" },
              payment_intent: "pi_456",
              failure_code: "card_declined",
              failure_message: "Your card was declined.",
              metadata: { plan: "Pro" },
            },
          },
        }),
      ),
    );

    expect(toJaredStripeEvent(stripeEvent)).toEqual({
      type: "stripe.charge_failed",
      payload: {
        amount: 1500,
        chargeId: "ch_456",
        currency: "usd",
        customerId: "cus_456",
        customerEmail: "buyer@example.com",
        description: undefined,
        livemode: true,
        metadata: { plan: "Pro" },
        paymentIntentId: "pi_456",
        receiptEmail: undefined,
        stripeEventId: "evt_456",
        created: 1_700_000_001,
        failureCode: "card_declined",
        failureMessage: "Your card was declined.",
      },
    });
  });

  it("normalizes charge.failed with only failure_message", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_789",
          type: "charge.failed",
          created: 1_700_000_002,
          livemode: false,
          data: {
            object: {
              id: "ch_789",
              amount: 2500,
              currency: "usd",
              failure_message: "Insufficient funds.",
            },
          },
        }),
      ),
    );

    const event = toJaredStripeEvent(stripeEvent);

    expect(event?.type).toBe("stripe.charge_failed");
    if (event?.type === "stripe.charge_failed") {
      expect(event.payload.failureMessage).toBe("Insufficient funds.");
      expect(event.payload.failureCode).toBeUndefined();
    }
  });

  it("normalizes charge.failed without any failure info", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_999",
          type: "charge.failed",
          created: 1_700_000_003,
          livemode: false,
          data: {
            object: {
              id: "ch_999",
              amount: 100,
              currency: "usd",
            },
          },
        }),
      ),
    );

    const event = toJaredStripeEvent(stripeEvent);

    expect(event?.type).toBe("stripe.charge_failed");
    if (event?.type === "stripe.charge_failed") {
      expect(event.payload.failureMessage).toBeUndefined();
      expect(event.payload.failureCode).toBeUndefined();
    }
  });

  it("ignores unsupported Stripe events", () => {
    const stripeEvent = parseStripeEvent(
      Buffer.from(
        JSON.stringify({
          id: "evt_123",
          type: "payment_intent.succeeded",
          created: 1_700_000_000,
          livemode: false,
          data: { object: {} },
        }),
      ),
    );

    expect(toJaredStripeEvent(stripeEvent)).toBeUndefined();
  });
});
