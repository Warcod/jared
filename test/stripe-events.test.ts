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
